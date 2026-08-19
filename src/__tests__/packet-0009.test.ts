import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockTossRewardAd();
mockRouter();

const TODAY = "2026-08-20";

// ── useCheckIns 훅 목 — Home.tsx는 이 훅만 사용한다(packet 지시) ──
interface MockCheckIn {
  date: string;
  createdAt: number;
  source: string;
  memo?: string;
}

let mockCheckins: MockCheckIn[];
let mockStreak: { current: number; best: number; lastCheckInDate: string | null; totalDays: number };
let mockIsLoading: boolean;

const mockAddCheckIn = vi.fn();

vi.mock("@/hooks/useCheckIns", () => ({
  useCheckIns: () => ({
    checkins: mockCheckins,
    streak: mockStreak,
    isLoading: mockIsLoading,
    addCheckIn: mockAddCheckIn,
    hasCheckIn: (date: string) => mockCheckins.some((c) => c.date === date),
    getCheckInsInRange: (start: string, end: string) =>
      mockCheckins.filter((c) => c.date >= start && c.date <= end),
    reload: vi.fn(),
    today: TODAY,
  }),
}));

import Home from "@/pages/Home";

describe("홈 화면 / — 체크인 + 스트릭 히어로", () => {
  beforeEach(() => {
    mockCheckins = [];
    mockStreak = { current: 0, best: 0, lastCheckInDate: null, totalDays: 0 };
    mockIsLoading = false;
    mockAddCheckIn.mockReset();
  });

  it("AC-1[P0]: 미체크인 상태에서 checkin-button 탭 시 CheckIn 저장 + Toast + streak-hero 갱신", async () => {
    mockAddCheckIn.mockImplementation(async (date: string, source: string, memo?: string) => {
      mockCheckins = [...mockCheckins, { date, createdAt: 1, source, ...(memo ? { memo } : {}) }];
      mockStreak = { current: 1, best: 1, lastCheckInDate: date, totalDays: 1 };
      return { ok: true };
    });

    renderWithRouter(React.createElement(Home));

    fireEvent.click(screen.getByTestId("checkin-button"));

    expect(mockAddCheckIn).toHaveBeenCalledTimes(1);
    const [callDate, callSource, callMemo] = mockAddCheckIn.mock.calls[0];
    expect(callDate).toBe(TODAY);
    expect(callSource).toBe("manual");
    expect(callMemo).toBeUndefined();

    await screen.findByText("오늘도 0원! 스트릭 1일째");

    await waitFor(() => {
      expect(screen.getByTestId("streak-hero").textContent).toMatch(/1/);
    });
  });

  it("AC-2[P0]: 이미 체크인한 경우 checkin-button이 비활성화되고 안내 Chip이 노출된다", () => {
    mockCheckins = [{ date: TODAY, createdAt: 1, source: "manual" }];
    mockStreak = { current: 1, best: 1, lastCheckInDate: TODAY, totalDays: 1 };

    renderWithRouter(React.createElement(Home));

    const button = screen.getByTestId("checkin-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("오늘 체크인 완료");
    expect(screen.getByText("내일 다시 도전").textContent).toBe("내일 다시 도전");
  });

  it("AC-3[P1]: 중복 체크인 시도 시 안내 Toast가 뜨고 기록 건수는 늘지 않는다", async () => {
    mockAddCheckIn.mockResolvedValue({ ok: false, reason: "DUPLICATE" });

    renderWithRouter(React.createElement(Home));
    fireEvent.click(screen.getByTestId("checkin-button"));

    await screen.findByText("오늘은 이미 체크인했어요");

    expect(mockCheckins.filter((c) => c.date === TODAY).length).toBe(0);
    expect(screen.getByTestId("streak-hero").textContent).toMatch(/0/);
  });

  it("AC-3[P1]: 저장 공간 부족 시 STORAGE_FULL 안내 Toast가 노출된다", async () => {
    mockAddCheckIn.mockResolvedValue({ ok: false, reason: "STORAGE_FULL" });

    renderWithRouter(React.createElement(Home));
    fireEvent.click(screen.getByTestId("checkin-button"));

    await screen.findByText("저장 공간이 부족해요. 오래된 기록을 정리해주세요");
  });

  it("AC-4[P1]: 메모 51자 입력 시 50자로 잘리고 저장 탭 시 memo 포함 체크인 후 시트가 닫힌다", async () => {
    mockAddCheckIn.mockImplementation(async (date: string, source: string, memo?: string) => {
      mockCheckins = [...mockCheckins, { date, createdAt: 1, source, ...(memo ? { memo } : {}) }];
      mockStreak = { current: 1, best: 1, lastCheckInDate: date, totalDays: 1 };
      return { ok: true };
    });

    renderWithRouter(React.createElement(Home));

    fireEvent.click(screen.getByTestId("memo-sheet-open"));
    const dialog = screen.getByRole("dialog");

    const textbox = within(dialog).getByRole("textbox") as HTMLInputElement;
    const long = "가".repeat(51);
    fireEvent.change(textbox, { target: { value: long } });

    expect(textbox.value.length).toBe(50);
    expect(textbox.value).toBe(long.slice(0, 50));
    expect(within(dialog).getByText("메모는 50자까지 입력할 수 있어요").textContent).toBe(
      "메모는 50자까지 입력할 수 있어요"
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(mockAddCheckIn).toHaveBeenCalledTimes(1);
    });
    const [, , callMemo] = mockAddCheckIn.mock.calls[0];
    expect(callMemo).toBe(long.slice(0, 50));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("AC-5[P0]: 기록이 없으면 streak-hero가 0을 표시하고 빈 상태 안내가 노출된다", () => {
    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("streak-hero").textContent).toMatch(/0/);
    expect(screen.getByText("첫 무지출 도전을 시작해보세요").textContent).toBe(
      "첫 무지출 도전을 시작해보세요"
    );
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
  });

  it("AC-5[P0]: 로딩 중에는 home-skeleton이 렌더된다", () => {
    mockIsLoading = true;

    renderWithRouter(React.createElement(Home));

    expect(screen.getByTestId("home-skeleton").getAttribute("data-testid")).toBe(
      "home-skeleton"
    );
  });

  it("AC-5[P0]: checkin-button은 52px 이상 높이로 지정된다", () => {
    renderWithRouter(React.createElement(Home));

    const button = screen.getByTestId("checkin-button") as HTMLButtonElement;
    const raw = button.style.minHeight || button.style.height || "0";
    const px = parseInt(raw, 10);

    expect(Number.isNaN(px)).toBe(false);
    expect(px).toBeGreaterThanOrEqual(52);
  });
});
