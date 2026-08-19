/**
 * Packet 0003: localStorage 영속 레이어 (CRUD 전용)
 *
 * TDD RED PHASE — 30 failing tests describing implementation.
 *
 * IMPLEMENTATION CHECKLIST (read tests to understand exact requirements):
 * - [ ] LS_KEYS constant (7 keys: checkins, streak, recovery, badges, profile, rankCache, flags)
 * - [ ] readCheckIns() → CheckIn[] (fixes corrupted JSON, returns [] by default)
 * - [ ] readStreak() → StreakState (current=0, best=0, lastCheckInDate=null, totalDays=0)
 * - [ ] readRecovery() → RecoveryWallet (tickets=0, earnedToday=0, earnedTodayDate=todayKST, usages=[])
 * - [ ] readBadges() → EarnedBadge[]
 * - [ ] readRankCache() → RankEntry[]
 * - [ ] readFlags() → AppFlags (onboardingSeen=false, lastSeenBadgeId=null)
 * - [ ] readProfile() → Profile (returns ensureProfile() if not set)
 * - [ ] writeCheckIns() → boolean (false on QuotaExceededError, never throws)
 * - [ ] writeStreak() → boolean
 * - [ ] writeRecovery() → boolean
 * - [ ] writeBadges() → boolean
 * - [ ] writeRankCache() → boolean
 * - [ ] writeFlags() → boolean
 * - [ ] writeProfile() → boolean
 * - [ ] ensureProfile() → Profile (UUID v4 + inviteCode /^[A-Z0-9]{6}$/, idempotent)
 * - [ ] Zero console.error calls
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type {
  CheckIn,
  StreakState,
  RecoveryWallet,
  EarnedBadge,
  Profile,
  RankEntry,
  AppFlags,
} from "@/lib/types";

describe("Packet 0003: localStorage 영속 레이어 (CRUD 전용)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1[P0]: 손상된 localStorage JSON 복구
  // localStorage['zss.v1.checkins']='{{{broken' 상태에서 readCheckIns()가 []를 반환하고
  // 키 값을 '[]'으로 갱신(자가 수정)
  // ============================================================================
  it("AC-1[P0]: readCheckIns() recovers from corrupted JSON and rewrites key", async () => {
    // 손상된 JSON을 저장
    localStorage.setItem("zss.v1.checkins", "{{{broken");

    const { readCheckIns } = await import("@/lib/storage");

    // readCheckIns()가 [] 반환해야 함
    const result = readCheckIns();
    expect(result).toEqual([]);

    // 키가 '[]'로 갱신되어야 함
    const fixed = localStorage.getItem("zss.v1.checkins");
    expect(fixed).toBe("[]");
  });

  it("AC-1[P0]: readStreak() recovers from corrupted JSON", async () => {
    localStorage.setItem("zss.v1.streak", "not valid json at all");

    const { readStreak } = await import("@/lib/storage");
    const result = readStreak();

    // Streak의 기본값 (empty state)
    expect(result).toBeDefined();
    expect(result.current).toBe(0);
  });

  it("AC-1[P1]: readRecovery() handles corrupted data gracefully", async () => {
    localStorage.setItem("zss.v1.recovery", "}{}{");

    const { readRecovery } = await import("@/lib/storage");
    const result = readRecovery();

    expect(result).toBeDefined();
    expect(result.tickets).toBe(0);
  });

  it("AC-1[P1]: readBadges() returns [] on corrupted JSON", async () => {
    localStorage.setItem("zss.v1.badges", "[[[[");

    const { readBadges } = await import("@/lib/storage");
    const result = readBadges();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  // ============================================================================
  // AC-2[P0]: storage.set이 QuotaExceededError를 던져도 false 반환, 예외 전파 X
  // ============================================================================
  it("AC-2[P0]: writeCheckIns() returns false on QuotaExceededError", async () => {
    const { writeCheckIns } = await import("@/lib/storage");

    // localStorage.setItem을 mock해서 QuotaExceededError 던지도록
    const quotaError = new DOMException("QuotaExceededError", "QuotaExceededError");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    const checkIn: CheckIn = {
      date: "2026-08-20",
      createdAt: Date.now(),
      source: "manual",
      memo: "test",
    };

    // writeCheckIns()가 false를 반환해야 함
    const result = writeCheckIns([checkIn]);
    expect(result).toBe(false);

    // 예외가 밖으로 전파되지 않아야 함 (위 호출이 throw 하지 않음)
    setItemSpy.mockRestore();
  });

  it("AC-2[P0]: writeStreak() returns false on storage quota exceeded", async () => {
    const { writeStreak } = await import("@/lib/storage");

    const quotaError = new DOMException("QuotaExceededError", "QuotaExceededError");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw quotaError;
    });

    const streak: StreakState = {
      current: 5,
      best: 10,
      lastCheckInDate: "2026-08-20",
      totalDays: 25,
    };

    const result = writeStreak(streak);
    expect(result).toBe(false);

    setItemSpy.mockRestore();
  });

  it("AC-2[P1]: writeRecovery() catches errors silently", async () => {
    const { writeRecovery } = await import("@/lib/storage");

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Generic storage error");
    });

    const recovery: RecoveryWallet = {
      tickets: 1,
      earnedToday: 0,
      earnedTodayDate: "2026-08-20",
      usages: [],
    };

    const result = writeRecovery(recovery);
    expect(result).toBe(false);

    setItemSpy.mockRestore();
  });

  it("AC-2[P1]: writeBadges() returns false on any write error", async () => {
    const { writeBadges } = await import("@/lib/storage");

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new TypeError("Storage write failed");
    });

    const badges: EarnedBadge[] = [{ id: "first_step", earnedAt: Date.now() }];

    const result = writeBadges(badges);
    expect(result).toBe(false);

    setItemSpy.mockRestore();
  });

  // ============================================================================
  // AC-3[P0]: ensureProfile() — UUID v4 + inviteCode 생성 및 일관성
  // ensureProfile() 2회 호출 시 동일 deviceUserId 반환
  // inviteCode가 /^[A-Z0-9]{6}$/ 만족
  // ============================================================================
  it("AC-3[P0]: ensureProfile() returns same deviceUserId on multiple calls", async () => {
    const { ensureProfile } = await import("@/lib/storage");

    // 첫 번째 호출
    const profile1 = ensureProfile();
    expect(profile1.deviceUserId).toBeDefined();
    expect(profile1.deviceUserId.length).toBeGreaterThan(0);

    // 두 번째 호출
    const profile2 = ensureProfile();
    expect(profile2.deviceUserId).toBe(profile1.deviceUserId);
  });

  it("AC-3[P0]: inviteCode matches /^[A-Z0-9]{6}$/", async () => {
    const { ensureProfile } = await import("@/lib/storage");

    const profile = ensureProfile();
    expect(profile.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("AC-3[P1]: ensureProfile() generates UUID v4 format for deviceUserId", async () => {
    const { ensureProfile } = await import("@/lib/storage");

    const profile = ensureProfile();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidv4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(profile.deviceUserId).toMatch(uuidv4Regex);
  });

  it("AC-3[P1]: ensureProfile() initializes profile with default values", async () => {
    const { ensureProfile } = await import("@/lib/storage");

    const profile = ensureProfile();

    expect(profile.nickname).toBeDefined();
    expect(profile.roomCode).toBeNull();
    expect(profile.onboardedAt).toBeNull();
  });

  // ============================================================================
  // AC-4[P0]: LS_KEYS 상수 정의 검증
  // ============================================================================
  it("AC-4[P0]: LS_KEYS constant has all required keys", async () => {
    const { LS_KEYS } = await import("@/lib/storage");

    expect(LS_KEYS).toBeDefined();
    expect(LS_KEYS.checkins).toBe("zss.v1.checkins");
    expect(LS_KEYS.streak).toBe("zss.v1.streak");
    expect(LS_KEYS.recovery).toBe("zss.v1.recovery");
    expect(LS_KEYS.badges).toBe("zss.v1.badges");
    expect(LS_KEYS.profile).toBe("zss.v1.profile");
    expect(LS_KEYS.rankCache).toBe("zss.v1.rankCache");
    expect(LS_KEYS.flags).toBe("zss.v1.flags");
  });

  // ============================================================================
  // AC-5[P0]: Entity read/write 래퍼들의 CRUD 일관성
  // ============================================================================
  it("AC-5[P0]: readCheckIns/writeCheckIns roundtrip", async () => {
    const { readCheckIns, writeCheckIns } = await import("@/lib/storage");

    const checkIns: CheckIn[] = [
      {
        date: "2026-08-20",
        createdAt: Date.now(),
        source: "manual",
        memo: "test",
      },
      {
        date: "2026-08-19",
        createdAt: Date.now(),
        source: "recovery",
      },
    ];

    const written = writeCheckIns(checkIns);
    expect(written).toBe(true);

    const read = readCheckIns();
    expect(read).toEqual(checkIns);
  });

  it("AC-5[P0]: readStreak/writeStreak roundtrip", async () => {
    const { readStreak, writeStreak } = await import("@/lib/storage");

    const streak: StreakState = {
      current: 7,
      best: 30,
      lastCheckInDate: "2026-08-20",
      totalDays: 42,
    };

    const written = writeStreak(streak);
    expect(written).toBe(true);

    const read = readStreak();
    expect(read).toEqual(streak);
  });

  it("AC-5[P1]: readRecovery/writeRecovery roundtrip", async () => {
    const { readRecovery, writeRecovery } = await import("@/lib/storage");

    const recovery: RecoveryWallet = {
      tickets: 2,
      earnedToday: 1,
      earnedTodayDate: "2026-08-20",
      usages: [{ recoveredDate: "2026-08-15", usedAt: Date.now() }],
    };

    const written = writeRecovery(recovery);
    expect(written).toBe(true);

    const read = readRecovery();
    expect(read).toEqual(recovery);
  });

  it("AC-5[P1]: readBadges/writeBadges roundtrip", async () => {
    const { readBadges, writeBadges } = await import("@/lib/storage");

    const badges: EarnedBadge[] = [
      { id: "first_step", earnedAt: Date.now() },
      { id: "streak_3", earnedAt: Date.now() - 10000 },
    ];

    const written = writeBadges(badges);
    expect(written).toBe(true);

    const read = readBadges();
    expect(read).toEqual(badges);
  });

  it("AC-5[P1]: readRankCache/writeRankCache roundtrip", async () => {
    const { readRankCache, writeRankCache } = await import("@/lib/storage");

    const ranks: RankEntry[] = [
      {
        userId: "user1",
        nickname: "Alice",
        currentStreak: 10,
        bestStreak: 20,
        totalDays: 50,
        rank: 1,
      },
      {
        userId: "user2",
        nickname: "Bob",
        currentStreak: 5,
        bestStreak: 15,
        totalDays: 30,
        rank: 2,
      },
    ];

    const written = writeRankCache(ranks);
    expect(written).toBe(true);

    const read = readRankCache();
    expect(read).toEqual(ranks);
  });

  it("AC-5[P1]: readFlags/writeFlags roundtrip", async () => {
    const { readFlags, writeFlags } = await import("@/lib/storage");

    const flags: AppFlags = {
      onboardingSeen: true,
      lastSeenBadgeId: "streak_7",
    };

    const written = writeFlags(flags);
    expect(written).toBe(true);

    const read = readFlags();
    expect(read).toEqual(flags);
  });

  it("AC-5[P1]: readProfile/writeProfile roundtrip", async () => {
    const { readProfile, writeProfile } = await import("@/lib/storage");

    const profile: Profile = {
      deviceUserId: "550e8400-e29b-41d4-a716-446655440000",
      nickname: "TestUser",
      inviteCode: "ABC123",
      roomCode: "ROOM001",
      onboardedAt: Date.now(),
    };

    const written = writeProfile(profile);
    expect(written).toBe(true);

    const read = readProfile();
    expect(read).toEqual(profile);
  });

  // ============================================================================
  // AC-6[P0]: 기본값 반환 (key가 없을 때)
  // ============================================================================
  it("AC-6[P0]: readCheckIns() returns [] when key not found", async () => {
    const { readCheckIns } = await import("@/lib/storage");

    // localStorage는 비어 있음
    const result = readCheckIns();
    expect(result).toEqual([]);
  });

  it("AC-6[P0]: readStreak() returns default state when key not found", async () => {
    const { readStreak } = await import("@/lib/storage");

    const result = readStreak();
    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.lastCheckInDate).toBeNull();
    expect(result.totalDays).toBe(0);
  });

  it("AC-6[P1]: readRecovery() returns default wallet when key not found", async () => {
    const { readRecovery } = await import("@/lib/storage");

    const result = readRecovery();
    expect(result.tickets).toBe(0);
    expect(result.earnedToday).toBe(0);
    expect(result.usages).toEqual([]);
  });

  it("AC-6[P1]: readBadges() returns [] when key not found", async () => {
    const { readBadges } = await import("@/lib/storage");

    const result = readBadges();
    expect(result).toEqual([]);
  });

  it("AC-6[P1]: readRankCache() returns [] when key not found", async () => {
    const { readRankCache } = await import("@/lib/storage");

    const result = readRankCache();
    expect(result).toEqual([]);
  });

  it("AC-6[P1]: readFlags() returns default flags when key not found", async () => {
    const { readFlags } = await import("@/lib/storage");

    const result = readFlags();
    expect(result.onboardingSeen).toBe(false);
    expect(result.lastSeenBadgeId).toBeNull();
  });

  // ============================================================================
  // AC-7[P0]: console.error 호출 0건
  // ============================================================================
  it("AC-7[P0]: no console.error calls during read/write operations", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const {
      readCheckIns,
      writeCheckIns,
      readStreak,
      writeStreak,
      readRecovery,
      writeRecovery,
      readBadges,
      writeBadges,
      readRankCache,
      writeRankCache,
      readFlags,
      writeFlags,
      readProfile,
      writeProfile,
      ensureProfile,
    } = await import("@/lib/storage");

    // 여러 read/write 연산 실행
    readCheckIns();
    writeCheckIns([]);
    readStreak();
    writeStreak({ current: 0, best: 0, lastCheckInDate: null, totalDays: 0 });
    readRecovery();
    writeRecovery({ tickets: 0, earnedToday: 0, earnedTodayDate: "2026-08-20", usages: [] });
    readBadges();
    writeBadges([]);
    readRankCache();
    writeRankCache([]);
    readFlags();
    writeFlags({ onboardingSeen: false, lastSeenBadgeId: null });
    readProfile();
    ensureProfile();

    // console.error가 호출되지 않았음
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  // ============================================================================
  // AC-8[P1]: readProfile() returns ensureProfile() on first call
  // ============================================================================
  it("AC-8[P1]: readProfile() returns created profile on first access", async () => {
    const { readProfile, ensureProfile } = await import("@/lib/storage");

    // 첫 읽기 — 기본값 또는 ensure된 프로필
    const profile = readProfile();
    expect(profile).toBeDefined();
    expect(profile.deviceUserId).toBeDefined();

    // ensureProfile은 같은 프로필 반환
    const ensured = ensureProfile();
    expect(ensured.deviceUserId).toBe(profile.deviceUserId);
  });

  // ============================================================================
  // AC-9[P1]: Consistency across multiple entity operations
  // ============================================================================
  it("AC-9[P1]: all entities persist and retrieve independently", async () => {
    const {
      readCheckIns,
      writeCheckIns,
      readStreak,
      writeStreak,
      readRecovery,
      writeRecovery,
    } = await import("@/lib/storage");

    const checkins: CheckIn[] = [{ date: "2026-08-20", createdAt: Date.now(), source: "manual" }];
    const streak: StreakState = { current: 1, best: 5, lastCheckInDate: "2026-08-20", totalDays: 1 };
    const recovery: RecoveryWallet = {
      tickets: 1,
      earnedToday: 0,
      earnedTodayDate: "2026-08-20",
      usages: [],
    };

    // Write all
    expect(writeCheckIns(checkins)).toBe(true);
    expect(writeStreak(streak)).toBe(true);
    expect(writeRecovery(recovery)).toBe(true);

    // Read and verify independence
    expect(readCheckIns()).toEqual(checkins);
    expect(readStreak()).toEqual(streak);
    expect(readRecovery()).toEqual(recovery);
  });

  // ============================================================================
  // AC-10[P1]: inviteCode uniqueness (multiple ensureProfile calls)
  // ============================================================================
  it("AC-10[P1]: inviteCode remains consistent across ensureProfile calls", async () => {
    const { ensureProfile } = await import("@/lib/storage");

    const code1 = ensureProfile().inviteCode;
    const code2 = ensureProfile().inviteCode;
    const code3 = ensureProfile().inviteCode;

    expect(code1).toBe(code2);
    expect(code2).toBe(code3);
  });
});
