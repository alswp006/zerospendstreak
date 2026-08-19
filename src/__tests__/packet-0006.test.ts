import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import type { EarnedBadge, RecoveryWallet, Profile } from "@/lib/types";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { LS_KEYS, readBadges, writeBadges, readRecovery, writeRecovery, readProfile, writeProfile } from "@/lib/storage";
import { todayKST, addDays } from "@/lib/date";
import { useBadges } from "@/hooks/useBadges";
import { useRecovery } from "@/hooks/useRecovery";
import { useProfile } from "@/hooks/useProfile";

mockAll();

describe("Packet 0006: 상태 훅 — useBadges / useRecovery / useProfile", () => {
  // ============================================================================
  // AC-1: 알 수 없는 BadgeId는 무시하고 earned.length === 0, 예외 0건
  // ============================================================================
  it("AC-1[P0]: useBadges.earned filters out unknown badge IDs", () => {
    // Arrange: 알 수 없는 ID 'streak_999'를 localStorage에 저장
    const invalidBadges: EarnedBadge[] = [
      { id: "streak_999" as any, earnedAt: Date.now() },
    ];
    seedLocalStorage({ [LS_KEYS.badges]: invalidBadges });

    // Act: useBadges 훅 호출
    const { result } = renderHook(() => useBadges());

    // Assert: 유효하지 않은 ID는 필터링되어야 함
    expect(result.current.earned).toHaveLength(0);
  });

  it("AC-1[P1]: useBadges.earned returns empty array when no badges stored", () => {
    // Arrange: localStorage 초기화
    localStorage.clear();

    // Act
    const { result } = renderHook(() => useBadges());

    // Assert
    expect(result.current.earned).toEqual([]);
  });

  // ============================================================================
  // AC-2[P0]: streak_7 보유 + current:8 → checkAndGrant 결과 granted.length === 0
  // grantBadges는 storage 실패 시 false 반환
  // ============================================================================
  it("AC-2[P0]: useBadges.checkAndGrant does not grant already-earned badges", () => {
    // Arrange: streak_7을 이미 획득한 상태
    const earned: EarnedBadge[] = [
      { id: "streak_7", earnedAt: Date.now() - 86400000 },
    ];
    seedLocalStorage({ [LS_KEYS.badges]: earned });

    // Act: checkAndGrant 호출 (currentStreak=8)
    const { result } = renderHook(() => useBadges());
    let grantedResult: any = null;

    act(() => {
      grantedResult = result.current.checkAndGrant(8, 50);
    });

    // Assert: granted 배열이 비어있어야 함 (streak_7은 이미 획득)
    expect(grantedResult).toHaveProperty("granted");
    expect(grantedResult.granted.filter((b: any) => b.id === "streak_7")).toHaveLength(0);
  });

  it("AC-2[P1]: useBadges.grantBadges returns false when storage fails", () => {
    // Arrange
    const { result } = renderHook(() => useBadges());
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new Error("QuotaExceededError");
    });

    // Act
    let grantResult = false;
    act(() => {
      grantResult = result.current.grantBadges([
        { id: "streak_3", earnedAt: Date.now() },
      ]);
    });

    // Assert
    expect(grantResult).toBe(false);
    spy.mockRestore();
  });

  it("AC-2[P2]: useBadges.grantBadges returns true on success", () => {
    // Arrange: 초기 상태 (배지 없음)
    localStorage.clear();
    const { result } = renderHook(() => useBadges());

    // Act: grantBadges 호출
    const badgesToGrant: EarnedBadge[] = [
      { id: "first_step", earnedAt: Date.now() },
    ];
    let grantResult = false;
    act(() => {
      grantResult = result.current.grantBadges(badgesToGrant);
    });

    // Assert
    expect(grantResult).toBe(true);
    expect(readBadges()).toContainEqual(
      expect.objectContaining({ id: "first_step" })
    );
  });

  // ============================================================================
  // AC-3[P0]: earnedTodayDate='2026-08-20'·today=08-20 → canEarn === false
  // '2026-08-19'이면 earnTicket() 후 wallet === {tickets:1,earnedToday:1,earnedTodayDate:'2026-08-20'}
  // ============================================================================
  it("AC-3[P0]: useRecovery.canEarn returns false when already earned today", () => {
    // Arrange: 오늘 이미 1개 획득
    const today = todayKST();
    const wallet: RecoveryWallet = {
      tickets: 0,
      earnedToday: 1,
      earnedTodayDate: today,
      usages: [],
    };
    seedLocalStorage({ [LS_KEYS.recovery]: wallet });

    // Act
    const { result } = renderHook(() => useRecovery());

    // Assert: canEarn이 false
    expect(result.current.canEarn).toBe(false);
  });

  it("AC-3[P1]: useRecovery.earnTicket succeeds when eligible and updates wallet", () => {
    // Arrange: 어제 데이터
    const yesterday = addDays(todayKST(), -1);
    const wallet: RecoveryWallet = {
      tickets: 0,
      earnedToday: 1,
      earnedTodayDate: yesterday,
      usages: [],
    };
    seedLocalStorage({ [LS_KEYS.recovery]: wallet });

    // Act: earnTicket 호출
    const { result } = renderHook(() => useRecovery());
    let earnResult: any = null;

    act(() => {
      earnResult = result.current.earnTicket();
    });

    // Assert: 성공하고 지갑 업데이트
    expect(earnResult).toHaveProperty("ok");
    expect(earnResult.ok).toBe(true);

    // Act: 재마운트 후 상태 확인
    const { result: result2 } = renderHook(() => useRecovery());
    const today = todayKST();

    expect(result2.current.wallet.tickets).toBe(1);
    expect(result2.current.wallet.earnedToday).toBe(1);
    expect(result2.current.wallet.earnedTodayDate).toBe(today);
  });

  // ============================================================================
  // AC-4[P0]: tickets:3에서 earnTicket() → {ok:false,reason:'MAX_TICKETS'}
  // ============================================================================
  it("AC-4[P0]: useRecovery.earnTicket rejects when max 3 tickets reached", () => {
    // Arrange: 3개 보유
    const wallet: RecoveryWallet = {
      tickets: 3,
      earnedToday: 0,
      earnedTodayDate: todayKST(),
      usages: [],
    };
    seedLocalStorage({ [LS_KEYS.recovery]: wallet });

    // Act: earnTicket 호출
    const { result } = renderHook(() => useRecovery());
    let earnResult: any = null;

    act(() => {
      earnResult = result.current.earnTicket();
    });

    // Assert: {ok:false, reason:'MAX_TICKETS'}
    expect(earnResult.ok).toBe(false);
    expect(earnResult.reason).toBe("MAX_TICKETS");
  });

  it("AC-4[P1]: useRecovery.useTicket decrements ticket count and records usage", () => {
    // Arrange: 2개 보유
    const wallet: RecoveryWallet = {
      tickets: 2,
      earnedToday: 0,
      earnedTodayDate: todayKST(),
      usages: [],
    };
    seedLocalStorage({ [LS_KEYS.recovery]: wallet });

    // Act: useTicket 호출 (recovery 날짜 지정)
    const { result } = renderHook(() => useRecovery());
    const targetDate = addDays(todayKST(), -1);
    let useResult: any = null;

    act(() => {
      useResult = result.current.useTicket(targetDate);
    });

    // Assert: 성공하고 티켓 개수 감소
    expect(useResult.ok).toBe(true);

    // Act: 상태 재확인
    const { result: result2 } = renderHook(() => useRecovery());
    expect(result2.current.wallet.tickets).toBe(1);
    expect(result2.current.wallet.usages).toHaveLength(1);
    expect(result2.current.wallet.usages[0].recoveredDate).toBe(targetDate);
  });

  // ============================================================================
  // AC-5[P0]: setNickname('  ') → {ok:false,reason:'INVALID_NICKNAME'} 및 미저장
  // markOnboarded() 후 재마운트 시 isOnboarded === true
  // ============================================================================
  it("AC-5[P0]: useProfile.setNickname rejects whitespace-only nicknames", () => {
    // Arrange
    localStorage.clear();
    const { result } = renderHook(() => useProfile());
    const originalNickname = result.current.profile.nickname;

    // Act: 공백만으로 된 닉네임 시도
    let setResult: any = null;
    act(() => {
      setResult = result.current.setNickname("  ");
    });

    // Assert: {ok:false, reason:'INVALID_NICKNAME'}
    expect(setResult.ok).toBe(false);
    expect(setResult.reason).toBe("INVALID_NICKNAME");
    // 닉네임이 저장되지 않았는지 확인
    expect(result.current.profile.nickname).toBe(originalNickname);
  });

  it("AC-5[P1]: useProfile.setNickname accepts valid nicknames", () => {
    // Arrange
    localStorage.clear();
    const { result } = renderHook(() => useProfile());
    const validNickname = "무지출러";

    // Act
    let setResult: any = null;
    act(() => {
      setResult = result.current.setNickname(validNickname);
    });

    // Assert
    expect(setResult.ok).toBe(true);
    expect(result.current.profile.nickname).toBe(validNickname);

    // Act: 재마운트 후 확인
    const { result: result2 } = renderHook(() => useProfile());
    expect(result2.current.profile.nickname).toBe(validNickname);
  });

  it("AC-5[P2]: useProfile.markOnboarded sets onboardedAt and persists", () => {
    // Arrange
    localStorage.clear();
    const { result } = renderHook(() => useProfile());
    expect(result.current.isOnboarded).toBe(false);

    // Act: markOnboarded 호출
    act(() => {
      result.current.markOnboarded();
    });

    // Assert: 상태 업데이트
    expect(result.current.isOnboarded).toBe(true);

    // Act: 재마운트 시뮬레이션
    const { result: result2 } = renderHook(() => useProfile());

    // Assert: onboarded 상태 유지
    expect(result2.current.isOnboarded).toBe(true);
    expect(result2.current.profile.onboardedAt).not.toBeNull();
  });

  it("AC-5[P3]: useProfile.isOnboarded reflects onboardedAt status", () => {
    // Arrange
    localStorage.clear();
    const { result: result1 } = renderHook(() => useProfile());

    // Assert: 초기 상태
    expect(result1.current.isOnboarded).toBe(false);

    // Act: markOnboarded 호출
    act(() => {
      result1.current.markOnboarded();
    });

    // Assert: isOnboarded 업데이트
    expect(result1.current.isOnboarded).toBe(true);
  });

  // ============================================================================
  // Layout / Integration Tests
  // ============================================================================
  it("useProfile hook returns initialized profile with valid UUID and inviteCode", () => {
    // Arrange
    localStorage.clear();

    // Act
    const { result } = renderHook(() => useProfile());

    // Assert: 기본 프로필이 자동 생성됨
    expect(result.current.profile).toHaveProperty("deviceUserId");
    expect(result.current.profile).toHaveProperty("nickname");
    expect(result.current.profile).toHaveProperty("inviteCode");
    expect(result.current.profile.deviceUserId).toBeTruthy();
    expect(result.current.profile.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("useRecovery hook initializes with correct defaults", () => {
    // Arrange
    localStorage.clear();

    // Act
    const { result } = renderHook(() => useRecovery());

    // Assert
    expect(result.current.wallet).toHaveProperty("tickets");
    expect(result.current.wallet).toHaveProperty("earnedToday");
    expect(result.current.wallet).toHaveProperty("earnedTodayDate");
    expect(result.current.wallet.tickets).toBe(0);
    expect(result.current.wallet.earnedToday).toBe(0);
    expect(result.current.wallet.earnedTodayDate).toBe(todayKST());
  });

  it("useBadges hook returns empty earned array on first load", () => {
    // Arrange
    localStorage.clear();

    // Act
    const { result } = renderHook(() => useBadges());

    // Assert
    expect(result.current.earned).toBeDefined();
    expect(Array.isArray(result.current.earned)).toBe(true);
    expect(result.current.earned).toHaveLength(0);
  });
});
