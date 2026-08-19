import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { CheckIn, RecoveryWallet } from "@/lib/types";

// NOTE: react-router-dom is intentionally NOT fully mocked via mockRouter() —
// this page reads location.state.targetDate, which the shared mockLocation stub
// (fixed at "/", state: null) would break. Only useNavigate is overridden.
mockTds();
mockAppsInToss();
mockTossRewardAd();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// useRecovery/useCheckIns 훅을 직접 목킹해 wallet/checkins 상태를 테스트마다 고정한다.
vi.mock("@/hooks/useRecovery", () => ({
  useRecovery: vi.fn(),
}));
vi.mock("@/hooks/useCheckIns", () => ({
  useCheckIns: vi.fn(),
}));

import { useRecovery } from "@/hooks/useRecovery";
import { useCheckIns } from "@/hooks/useCheckIns";
import Recover from "@/pages/Recover";

const mockedUseRecovery = vi.mocked(useRecovery);
const mockedUseCheckIns = vi.mocked(useCheckIns);

const TODAY = "2026-08-20";
const YESTERDAY = "2026-08-19";

function setRecovery(
  wallet: RecoveryWallet,
  overrides: { canEarn?: boolean; earnTicket?: ReturnType<typeof vi.fn>; useTicket?: ReturnType<typeof vi.fn> } = {}
) {
  mockedUseRecovery.mockReturnValue({
    wallet,
    canEarn: overrides.canEarn ?? true,
    earnTicket: overrides.earnTicket ?? vi.fn(() => ({ ok: true })),
    useTicket: overrides.useTicket ?? vi.fn(() => ({ ok: true })),
  });
}

function makeCheckIns(dates: string[]): CheckIn[] {
  return dates.map((date) => ({ date, createdAt: Date.now(), source: "manual" as const }));
}

function setCheckIns(checkins: CheckIn[], addCheckIn = vi.fn(async () => ({ ok: true as const }))) {
  mockedUseCheckIns.mockReturnValue({
    checkins,
    streak: { current: 0, best: 0, lastCheckInDate: null, totalDays: checkins.length },
    isLoading: false,
    addCheckIn,
    hasCheckIn: (date: string) => checkins.some((c) => c.date === date),
    getCheckInsInRange: () => checkins,
    reload: vi.fn(),
    today: TODAY,
  });
}

// 최근 7일 중 어제(2026-08-19)만 미체크, 나머지(08-13~08-18)는 전부 체크됨 → 어제 하루만 복구 가능
const MOSTLY_CHECKED_DATES = ["2026-08-18", "2026-08-17", "2026-08-16", "2026-08-15", "2026-08-14", "2026-08-13"];

// 최근 7일이 전부 체크됨 → 복구 가능한 날짜 0건
const ALL_CHECKED_DATES = [YESTERDAY, ...MOSTLY_CHECKED_DATES];

function renderRecover(initialEntries: any[] = [{ pathname: "/recover", state: null }]) {
  return renderWithRouter(React.createElement(Recover), { initialEntries });
}

describe("스트릭 복구 화면 /recover", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: tickets >= 1 + 대상 날짜 선택 상태에서 '복구하기' 탭 시 recovery CheckIn 저장 + 티켓 차감 + 성공 Toast를 보여준다", async () => {
    const useTicket = vi.fn(() => ({ ok: true as const }));
    setRecovery({ tickets: 1, earnedToday: 0, earnedTodayDate: "", usages: [] }, { useTicket });

    const addCheckIn = vi.fn(async () => ({ ok: true as const }));
    setCheckIns(makeCheckIns(MOSTLY_CHECKED_DATES), addCheckIn);

    renderRecover([{ pathname: "/recover", state: { targetDate: YESTERDAY } }]);

    const recoverButton = screen.getByRole("button", { name: "복구하기" });
    expect(recoverButton).not.toBeDisabled();
    fireEvent.click(recoverButton);

    await waitFor(() => {
      expect(addCheckIn).toHaveBeenCalledWith(YESTERDAY, "recovery");
    });
    expect(useTicket).toHaveBeenCalledWith(YESTERDAY);
    expect(await screen.findByText("스트릭을 복구했어요")).toBeInTheDocument();
  });

  it("AC-2[P0]: tickets === 0이면 복구 버튼이 비활성화되고 '광고 보고 복구권 받기' 버튼이 노출된다", () => {
    setRecovery({ tickets: 0, earnedToday: 0, earnedTodayDate: "", usages: [] });
    setCheckIns(makeCheckIns(MOSTLY_CHECKED_DATES));

    renderRecover();

    const recoverButton = screen.getByRole("button", { name: "복구하기" });
    expect(recoverButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "광고 보고 복구권 받기" })).toBeInTheDocument();
  });

  it("AC-3: earnedToday === 1이고 오늘 날짜와 같으면 획득 버튼이 비활성화되고 안내 문구가 보인다", () => {
    setRecovery(
      { tickets: 1, earnedToday: 1, earnedTodayDate: TODAY, usages: [] },
      { canEarn: false }
    );
    setCheckIns(makeCheckIns(MOSTLY_CHECKED_DATES));

    renderRecover();

    const earnButton = screen.getByRole("button", { name: "광고 보고 복구권 받기" });
    expect(earnButton).toBeDisabled();
    expect(screen.getByText("오늘은 이미 받았어요")).toBeInTheDocument();
  });

  it("AC-4: tickets === 3에서 획득을 시도하면 최대 보유 한도 Toast를 보여준다", async () => {
    const earnTicket = vi.fn(() => ({ ok: false as const, reason: "MAX_TICKETS" as const }));
    setRecovery(
      { tickets: 3, earnedToday: 0, earnedTodayDate: "", usages: [] },
      { canEarn: true, earnTicket }
    );
    setCheckIns(makeCheckIns(MOSTLY_CHECKED_DATES));

    renderRecover();

    const earnButton = screen.getByRole("button", { name: "광고 보고 복구권 받기" });
    fireEvent.click(earnButton);

    await waitFor(() => {
      expect(earnTicket).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText("복구권은 최대 3개까지 가질 수 있어요")).toBeInTheDocument();
  });

  it("AC-5: 복구 가능한 날짜가 0건이면 EmptyState '복구할 날이 없어요'와 아이콘을 보여준다", () => {
    setRecovery({ tickets: 1, earnedToday: 0, earnedTodayDate: "", usages: [] });
    setCheckIns(makeCheckIns(ALL_CHECKED_DATES));

    renderRecover();

    expect(screen.getByText("복구할 날이 없어요")).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).toBeInTheDocument();
  });
});
