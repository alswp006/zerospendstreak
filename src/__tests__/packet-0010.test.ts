import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { CheckIn } from "@/lib/types";

mockAll();

// useCheckIns 훅을 직접 목킹해 checkins/today를 테스트마다 고정한다.
vi.mock("@/hooks/useCheckIns", () => ({
  useCheckIns: vi.fn(),
}));

import { useCheckIns } from "@/hooks/useCheckIns";
import Calendar from "@/pages/Calendar";

const mockedUseCheckIns = vi.mocked(useCheckIns);

function setCheckIns(checkins: CheckIn[], today: string) {
  mockedUseCheckIns.mockReturnValue({
    checkins,
    streak: { current: 0, best: 0, lastCheckInDate: null, totalDays: checkins.length },
    isLoading: false,
    addCheckIn: vi.fn(),
    hasCheckIn: (date: string) => checkins.some((c) => c.date === date),
    getCheckInsInRange: (start: string, end: string) =>
      checkins.filter((c) => c.date >= start && c.date <= end),
    reload: vi.fn(),
    today,
  });
}

describe("캘린더 화면 /calendar", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setCheckIns([], "2026-08-20");
  });

  it("AC-1[P0]: 2026-08 선택 시 8월 1~31일 셀이 모두 렌더되고 각 셀 크기가 44x44 이상이다", () => {
    renderWithRouter(React.createElement(Calendar));

    const dayCells = screen.getAllByTestId(/^day-2026-08-\d{2}$/);
    expect(dayCells).toHaveLength(31);

    const firstCell = screen.getByTestId("day-2026-08-01");
    const computed = getComputedStyle(firstCell);
    expect(parseInt(computed.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(computed.minWidth, 10)).toBeGreaterThanOrEqual(44);
  });

  it("AC-2[P0]: 체크인된 날짜는 blue50 배경, 미체크 날짜는 grey50/background 배경이다", () => {
    setCheckIns(
      [{ date: "2026-08-20", createdAt: Date.now(), source: "manual" }],
      "2026-08-20"
    );
    renderWithRouter(React.createElement(Calendar));

    const checkedCell = screen.getByTestId("day-2026-08-20");
    expect(checkedCell.style.backgroundColor).toBe("var(--tds-color-blue50)");

    const uncheckedCell = screen.getByTestId("day-2026-08-05");
    expect(["var(--tds-color-grey50)", "var(--tds-color-background)"]).toContain(
      uncheckedCell.style.backgroundColor
    );
  });

  it("AC-3[P0]: 미체크인 과거 7일 이내 셀 탭 시 BottomSheet가 뜨고 '복구하기' 탭 시 /recover로 이동한다", () => {
    setCheckIns([], "2026-08-20");
    renderWithRouter(React.createElement(Calendar));

    const recoverableCell = screen.getByTestId("day-2026-08-15");
    fireEvent.click(recoverableCell);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const recoverButton = screen.getByRole("button", { name: "복구하기" });
    fireEvent.click(recoverButton);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/recover", {
      state: { targetDate: "2026-08-15" },
    });
  });

  it("AC-3-edge: 8일 이상 지난 미체크 셀 탭은 BottomSheet를 띄우지 않는다", () => {
    setCheckIns([], "2026-08-20");
    renderWithRouter(React.createElement(Calendar));

    const tooOldCell = screen.getByTestId("day-2026-08-01");
    fireEvent.click(tooOldCell);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: 기록이 0건인 달은 '이 달은 기록이 없어요' 안내가 렌더된다", () => {
    setCheckIns([], "2026-08-20");
    renderWithRouter(React.createElement(Calendar));

    expect(screen.getByText("이 달은 기록이 없어요")).toBeInTheDocument();
  });

  it("AC-5[P0]: 월 Chip 탭 시 해당 월 그리드로 전환되고 선택 Chip만 활성 상태다", () => {
    setCheckIns([], "2026-08-20");
    renderWithRouter(React.createElement(Calendar));

    const augChip = screen.getByRole("button", { name: "8월" });
    expect(augChip).toHaveAttribute("aria-pressed", "true");

    const julChip = screen.getByRole("button", { name: "7월" });
    expect(julChip).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(julChip);

    expect(julChip).toHaveAttribute("aria-pressed", "true");
    expect(augChip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("day-2026-07-01")).toBeInTheDocument();
    expect(screen.queryByTestId("day-2026-08-01")).not.toBeInTheDocument();
  });
});
