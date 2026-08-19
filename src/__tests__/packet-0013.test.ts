import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { EarnedBadge } from "@/lib/types";
import { BADGE_DEFS } from "@/lib/badgeDefs";

mockAll();

// useBadges 훅을 직접 목킹해 획득 뱃지 목록을 테스트마다 고정한다.
vi.mock("@/hooks/useBadges", () => ({
  useBadges: vi.fn(),
}));

import { useBadges } from "@/hooks/useBadges";
import Badges from "@/pages/Badges";

const mockedUseBadges = vi.mocked(useBadges);

function setEarned(earned: EarnedBadge[]) {
  mockedUseBadges.mockReturnValue({
    earned,
    checkAndGrant: vi.fn(() => ({ granted: [] })),
    grantBadges: vi.fn(() => true),
  });
}

describe("뱃지 컬렉션 화면 /badges", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setEarned([]);
  });

  it("AC-1[P0]: BADGE_DEFS 9개가 3열 그리드로 렌더되고 각 셀은 44x44px 이상이다", () => {
    renderWithRouter(React.createElement(Badges));

    const cells = BADGE_DEFS.map((def) => screen.getByTestId(`badge-${def.id}`));
    expect(cells).toHaveLength(9);
    expect(BADGE_DEFS.length).toBe(9);

    const grid = screen.getByTestId("badge-grid");
    expect(getComputedStyle(grid.firstElementChild as Element).gridTemplateColumns).toContain(
      "repeat(3"
    );

    const firstCell = cells[0];
    const computed = getComputedStyle(firstCell);
    expect(parseInt(computed.minHeight, 10)).toBeGreaterThanOrEqual(44);
    expect(parseInt(computed.minWidth, 10)).toBeGreaterThanOrEqual(44);
  });

  it("AC-2[P0]: 획득 뱃지 셀 탭 시 BottomSheet에 획득일이 표시된다", () => {
    setEarned([{ id: "streak_7", earnedAt: new Date("2026-08-15T00:00:00+09:00").getTime() }]);
    renderWithRouter(React.createElement(Badges));

    screen.getByTestId("badge-streak_7").click();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/2026년 8월 15일/)).toBeInTheDocument();
    expect(screen.getByText("일주일 완주")).toBeInTheDocument();
  });

  it("AC-2[P0]: 미획득 셀은 흐리게 표시되고 BottomSheet에 조건 텍스트가 나온다", () => {
    setEarned([]);
    renderWithRouter(React.createElement(Badges));

    const cell = screen.getByTestId("badge-streak_7");
    expect(parseFloat(getComputedStyle(cell).opacity)).toBeLessThan(1);

    cell.click();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/연속 7일/)).toBeInTheDocument();
  });

  it("AC-3: 획득 0개면 '아직 뱃지가 없어요' 안내와 함께 9개 셀 모두 잠금 상태로 렌더된다", () => {
    setEarned([]);
    renderWithRouter(React.createElement(Badges));

    expect(screen.getByText("아직 뱃지가 없어요")).toBeInTheDocument();

    const lockedCells = BADGE_DEFS.map((def) => screen.getByTestId(`badge-${def.id}`));
    lockedCells.forEach((cell) => {
      expect(parseFloat(getComputedStyle(cell).opacity)).toBeLessThan(1);
    });
  });

  it("AC-4: location.state.highlightBadgeId='streak_7'로 진입 시 해당 셀 BottomSheet가 자동으로 열린다", () => {
    setEarned([{ id: "streak_7", earnedAt: Date.now() }]);
    renderWithRouter(React.createElement(Badges), {
      initialEntries: [{ pathname: "/badges", state: { highlightBadgeId: "streak_7" } }],
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("일주일 완주")).toBeInTheDocument();
  });

  it("AC-5[P0]: 상단에 '9개 중 N개 획득' 요약 Chip이 렌더된다", () => {
    setEarned([
      { id: "first_step", earnedAt: Date.now() },
      { id: "streak_3", earnedAt: Date.now() },
    ]);
    renderWithRouter(React.createElement(Badges));

    expect(screen.getByText("9개 중 2개 획득")).toBeInTheDocument();
  });

  it("AC-5: 획득이 0개일 때는 '9개 중 0개 획득'으로 렌더된다", () => {
    setEarned([]);
    renderWithRouter(React.createElement(Badges));

    expect(screen.getByText("9개 중 0개 획득")).toBeInTheDocument();
  });
});
