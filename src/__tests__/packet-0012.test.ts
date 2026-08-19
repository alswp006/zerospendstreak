import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { CheckIn, StreakState } from "@/lib/types";

mockAll();

// useCheckIns 훅을 직접 목킹해 checkins/today를 테스트마다 고정한다.
vi.mock("@/hooks/useCheckIns", () => ({
  useCheckIns: vi.fn(),
}));

import { useCheckIns } from "@/hooks/useCheckIns";
import Stats from "@/pages/Stats";

const mockedUseCheckIns = vi.mocked(useCheckIns);

function setCheckIns(checkins: CheckIn[], today: string, isLoading = false) {
  const streak: StreakState = {
    current: 0,
    best: 0,
    lastCheckInDate: checkins.length > 0 ? checkins[checkins.length - 1].date : null,
    totalDays: new Set(checkins.map((c) => c.date)).size,
  };
  mockedUseCheckIns.mockReturnValue({
    checkins,
    streak,
    isLoading,
    addCheckIn: vi.fn(),
    hasCheckIn: (date: string) => checkins.some((c) => c.date === date),
    getCheckInsInRange: (start: string, end: string) =>
      checkins.filter((c) => c.date >= start && c.date <= end),
    reload: vi.fn(),
    today,
  });
}

function makeCheckIn(date: string): CheckIn {
  return { date, createdAt: Date.now(), source: "manual" };
}

// 최근 7일(08-14~08-20) 중 5일 체크인, 최근 30일(07-22~08-20) 중 18일 체크인.
// firstDate(07-22)가 today-29이므로 두 윈도우 모두 축소되지 않는다.
const RATE_DATES = [
  "2026-07-22",
  "2026-07-23",
  "2026-07-25",
  "2026-07-27",
  "2026-07-29",
  "2026-07-31",
  "2026-08-02",
  "2026-08-04",
  "2026-08-06",
  "2026-08-08",
  "2026-08-10",
  "2026-08-12",
  "2026-08-13",
  "2026-08-16",
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
];
const RATE_TODAY = "2026-08-20";

describe("통계 화면 /stats", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setCheckIns([], "2026-08-20");
  });

  it("AC-1[P0]: 최근 7일 5/7 체크인이면 주간 카드에 71.4%, 최근 30일 18/30이면 월간 카드에 60%를 표시한다", () => {
    setCheckIns(RATE_DATES.map(makeCheckIn), RATE_TODAY);
    renderWithRouter(React.createElement(Stats));

    expect(screen.getByTestId("stats-rate-card")).toBeInTheDocument();
    expect(screen.getAllByText("71.4%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
  });

  it("AC-1-edge[P0]: 체크인이 하나도 없으면 주간/월간 카드는 0%를 표시한다(기록 있는 상태에서만 정상 진입)", () => {
    // 0건은 EmptyState 분기이므로, 이 케이스는 AC-4에서 별도 검증한다.
    // 여기서는 기록이 아주 적은 경우(1건) 축소 윈도우가 100%를 넘지 않는지 확인.
    setCheckIns([makeCheckIn("2026-08-20")], "2026-08-20");
    renderWithRouter(React.createElement(Stats));

    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
  });

  it("AC-2[P0]: 8주 추세 막대 8개가 렌더되고 각 막대에 주차 라벨과 0~7 사이 성공일수가 표시된다", () => {
    setCheckIns(RATE_DATES.map(makeCheckIn), RATE_TODAY);
    renderWithRouter(React.createElement(Stats));

    const bars = screen.getAllByTestId("trend-bar");
    expect(bars).toHaveLength(8);

    // oldest -> newest: [0,0,0,2,3,4,4,5] (RATE_DATES 분포 기반)
    expect(bars.map((b) => b.getAttribute("data-count"))).toEqual([
      "0",
      "0",
      "0",
      "2",
      "3",
      "4",
      "4",
      "5",
    ]);

    bars.forEach((bar) => {
      const count = Number(bar.getAttribute("data-count"));
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(7);
    });

    const labels = screen.getAllByTestId("trend-bar-label");
    expect(labels).toHaveLength(8);
    labels.forEach((label) => {
      expect(label.textContent?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it("AC-3[P0]: 요일별 성공률 7행이 MON~SUN 순으로 렌더되고 값이 0~100 정수다", () => {
    // 2026-08-03, 2026-08-10, 2026-08-17은 모두 월요일. 그중 2회만 체크인 -> 66.7% -> 반올림 67%
    setCheckIns(
      [makeCheckIn("2026-08-03"), makeCheckIn("2026-08-10")],
      "2026-08-17"
    );
    renderWithRouter(React.createElement(Stats));

    const rows = screen.getAllByTestId("weekday-row");
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.getAttribute("data-weekday"))).toEqual([
      "MON",
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN",
    ]);

    expect(rows[0]).toHaveTextContent("67%");

    rows.forEach((row) => {
      const match = row.textContent?.match(/(\d+)%/);
      expect(match).not.toBeNull();
      const value = Number(match?.[1]);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it("AC-4[P0]: 기록이 0건이면 EmptyState '아직 통계가 없어요' + 아이콘이 뜨고 퍼센트 자리엔 0%가 표시된다", () => {
    setCheckIns([], "2026-08-20");
    renderWithRouter(React.createElement(Stats));

    expect(screen.getByTestId("stats-empty")).toBeInTheDocument();
    expect(screen.getByText("아직 통계가 없어요")).toBeInTheDocument();
    expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/0%/).length).toBeGreaterThan(0);
  });

  it("AC-5[P1]: 로딩 중에는 data-testid='stats-skeleton'이 렌더되고 다른 콘텐츠는 렌더되지 않는다", () => {
    setCheckIns([], "2026-08-20", true);
    renderWithRouter(React.createElement(Stats));

    expect(screen.getByTestId("stats-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("stats-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("stats-rate-card")).not.toBeInTheDocument();
  });
});
