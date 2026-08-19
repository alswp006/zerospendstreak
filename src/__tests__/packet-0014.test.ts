import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { LS_KEYS } from "@/lib/storage";
import type { RankEntry, Profile } from "@/lib/types";

mockTds();
mockAppsInToss();
mockTossRewardAd();
mockRouter();

// ── useProfile 훅 목 (Rank.tsx는 useProfile을 통해 deviceUserId/roomCode를 얻는다) ──
const mockProfile: Profile = {
  deviceUserId: "device-test-1",
  nickname: "제로소비왕",
  inviteCode: "K3M9QZ",
  roomCode: null,
  onboardedAt: Date.now(),
};

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: mockProfile,
    isOnboarded: true,
    setNickname: vi.fn(),
    markOnboarded: vi.fn(),
  }),
}));

// ── rankApi 목 (네트워크 격리 — packet-0007에서 검증된 계약대로 mock) ──
const mockIsRankEnabled = vi.fn(() => true);
const mockJoinRoom = vi.fn();
const mockFetchRank = vi.fn();

vi.mock("@/lib/rankApi", () => ({
  isRankEnabled: () => mockIsRankEnabled(),
  joinRoom: (deviceUserId: string, roomCode: string) => mockJoinRoom(deviceUserId, roomCode),
  fetchRank: (roomCode: string) => mockFetchRank(roomCode),
}));

import Rank from "@/pages/Rank";

const ENTRIES: RankEntry[] = [
  { userId: "device-other-2", nickname: "짠돌이", currentStreak: 20, bestStreak: 30, totalDays: 40, rank: 2 },
  { userId: "device-test-1", nickname: "제로소비왕", currentStreak: 30, bestStreak: 30, totalDays: 50, rank: 1 },
  { userId: "device-other-3", nickname: "절약왕", currentStreak: 5, bestStreak: 10, totalDays: 12, rank: 3 },
];

describe("랭킹 화면 /rank", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockIsRankEnabled.mockReset().mockReturnValue(true);
    mockJoinRoom.mockReset();
    mockFetchRank.mockReset().mockResolvedValue({ ok: true, entries: [] });
    mockProfile.roomCode = null;
    localStorage.clear();
  });

  // ============================================================================
  // AC-1: roomCode가 null이면 초대 코드 입력 + 참여하기 버튼, 형식 불일치 시 에러
  // ============================================================================
  it("AC-1[P0]: roomCode가 null이면 초대 코드 입력칸과 참여하기 버튼이 노출된다", () => {
    renderWithRouter(React.createElement(Rank));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.tagName).toBe("INPUT");
    const joinButton = screen.getByRole("button", { name: "참여하기" });
    expect(joinButton.tagName).toBe("BUTTON");
  });

  it("AC-1[P0]: 형식에 맞지 않는 초대 코드 입력 시 에러 메시지가 노출되고 joinRoom은 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Rank));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ab12" } }); // 4자, 소문자 포함 — 형식 불일치

    const joinButton = screen.getByRole("button", { name: "참여하기" });
    fireEvent.click(joinButton);

    expect(screen.getByText("초대 코드는 6자예요").textContent).toBe("초대 코드는 6자예요");
    expect(mockJoinRoom).not.toHaveBeenCalled();
  });

  // ============================================================================
  // AC-2: joinRoom 결과 ROOM_NOT_FOUND → Toast '방을 찾을 수 없어요'
  // ============================================================================
  it("AC-2[P0]: joinRoom이 ROOM_NOT_FOUND를 반환하면 Toast로 안내한다", async () => {
    mockJoinRoom.mockResolvedValue({ ok: false, code: "ROOM_NOT_FOUND" });
    renderWithRouter(React.createElement(Rank));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "AB12CD" } }); // 형식은 유효

    const joinButton = screen.getByRole("button", { name: "참여하기" });
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockJoinRoom).toHaveBeenCalledWith("device-test-1", "AB12CD");
    });

    await waitFor(() => {
      const toast = screen.getByRole("status");
      expect(toast.textContent).toBe("방을 찾을 수 없어요");
    });
  });

  // ============================================================================
  // AC-3: fetchRank 성공 시 rank 오름차순 렌더 + 내 deviceUserId 행에 Chip '나'
  // ============================================================================
  it("AC-3[P0]: 랭킹 목록이 rank 오름차순으로 렌더되고 내 행에는 '나' 칩이 표시된다", async () => {
    mockProfile.roomCode = "AB12CD";
    mockFetchRank.mockResolvedValue({ ok: true, entries: ENTRIES });

    renderWithRouter(React.createElement(Rank));

    await waitFor(() => {
      expect(mockFetchRank).toHaveBeenCalledWith("AB12CD");
    });

    const rows = await screen.findAllByTestId("rank-entry");
    expect(rows).toHaveLength(3);
    // ENTRIES는 rank 2,1,3 순으로 입력됐지만 화면은 1,2,3 오름차순이어야 한다
    expect(rows[0].textContent).toContain("제로소비왕");
    expect(rows[1].textContent).toContain("짠돌이");
    expect(rows[2].textContent).toContain("절약왕");

    // 내 deviceUserId(device-test-1) 행에만 '나' 칩
    expect(rows[0].textContent).toContain("나");
    expect(rows[1].textContent).not.toContain("나");
  });

  // ============================================================================
  // AC-4: fetchRank NETWORK 실패 → 캐시 목록 + 안내 + 재시도 버튼, 크래시 0
  // ============================================================================
  it("AC-4[P0]: fetchRank가 NETWORK 실패하면 캐시된 목록과 재시도 버튼이 크래시 없이 노출된다", async () => {
    mockProfile.roomCode = "AB12CD";
    seedLocalStorage({ [LS_KEYS.rankCache]: ENTRIES });
    mockFetchRank.mockResolvedValue({ ok: false, code: "NETWORK" });

    expect(() => renderWithRouter(React.createElement(Rank))).not.toThrow();

    await waitFor(() => {
      expect(mockFetchRank).toHaveBeenCalledWith("AB12CD");
    });

    const rows = await screen.findAllByTestId("rank-entry");
    expect(rows).toHaveLength(3);
    expect(screen.getByText("지금은 순위를 불러올 수 없어요").textContent).toBe(
      "지금은 순위를 불러올 수 없어요"
    );
    expect(screen.getByRole("button", { name: "다시 시도" }).tagName).toBe("BUTTON");
  });

  // ============================================================================
  // AC-5: isRankEnabled() === false → '랭킹은 곧 열려요' 안내만, fetch 0회
  // ============================================================================
  it("AC-5[P0]: isRankEnabled가 false면 안내 문구만 렌더하고 fetchRank는 호출되지 않는다", () => {
    mockIsRankEnabled.mockReturnValue(false);
    mockProfile.roomCode = "AB12CD";

    renderWithRouter(React.createElement(Rank));

    expect(screen.getByText("랭킹은 곧 열려요").textContent).toBe("랭킹은 곧 열려요");
    expect(mockFetchRank).not.toHaveBeenCalled();
    expect(mockJoinRoom).not.toHaveBeenCalled();
  });
});
