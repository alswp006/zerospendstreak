import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { todayKST } from "@/lib/date";
import { LS_KEYS, readCheckIns, writeProfile } from "@/lib/storage";
import type { CheckIn, Profile } from "@/lib/types";

mockTds();
mockAppsInToss();
mockTossRewardAd();
mockRouter();

// ── packet heal-1-02: Home.tsx가 heal-1-01에서 확정된 useCheckIns 실제 훅과 맞물려
// 정상 동작하는지 검증한다. packet-0009.test.ts는 useCheckIns를 목으로 대체해 UI
// 분기만 검증했으나, 여기서는 훅을 목하지 않고 실제 localStorage 계약으로 통합
// 동작(검증 순서·롤백·스트릭 캐시)까지 확인한다. ──
import Home from "@/pages/Home";

const TODAY = todayKST();

function readStoredCheckins(): CheckIn[] {
  return JSON.parse(localStorage.getItem(LS_KEYS.checkins) ?? "[]");
}

describe("0009 완성 — 홈 화면 통합 (실제 useCheckIns 훅)", () => {
  it("AC-1[P0]: 미체크인 상태에서 checkin-button 탭 → 실제 저장 + Toast + streak-hero 갱신", async () => {
    renderWithRouter(React.createElement(Home));

    const button = await screen.findByTestId("checkin-button");
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    await screen.findByText("오늘도 0원! 스트릭 1일째");

    await waitFor(() => {
      expect(screen.getByTestId("streak-hero").textContent).toMatch(/1/);
    });

    const stored = readStoredCheckins();
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe(TODAY);
    expect(stored[0].source).toBe("manual");
  });

  it("AC-2[P0]: 이미 체크인한 날짜가 저장돼 있으면 checkin-button이 비활성화되고 Chip이 노출된다", async () => {
    localStorage.setItem(
      LS_KEYS.checkins,
      JSON.stringify([{ date: TODAY, createdAt: Date.now(), source: "manual" }] satisfies CheckIn[])
    );

    renderWithRouter(React.createElement(Home));

    const button = (await screen.findByTestId("checkin-button")) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.textContent).toContain("오늘 체크인 완료");
    expect(screen.getByText("내일 다시 도전").textContent).toBe("내일 다시 도전");
  });

  it("AC-3[P1]: 저장 계층에 이미 오늘 기록이 있으면(경쟁 상황) DUPLICATE Toast가 뜨고 기록은 1건으로 유지된다", async () => {
    renderWithRouter(React.createElement(Home));
    const button = await screen.findByTestId("checkin-button");

    // 훅의 React 상태가 아직 반영하지 못한 외부 기록(다른 탭 등)을 저장 계층에 직접 주입 —
    // 버튼은 여전히 활성 상태지만 addCheckIn 내부는 매 호출마다 storage를 새로 읽는다.
    localStorage.setItem(
      LS_KEYS.checkins,
      JSON.stringify([{ date: TODAY, createdAt: Date.now(), source: "manual" }] satisfies CheckIn[])
    );

    fireEvent.click(button);

    await screen.findByText("오늘은 이미 체크인했어요");
    expect(readStoredCheckins().filter((c) => c.date === TODAY)).toHaveLength(1);
  });

  it("AC-3[P1]: storage.setItem이 실패하면 STORAGE_FULL Toast가 뜨고 기록은 저장되지 않는다", async () => {
    renderWithRouter(React.createElement(Home));
    const button = await screen.findByTestId("checkin-button");

    const realSetItem = Storage.prototype.setItem.bind(localStorage);
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation((key, value) => {
      if (key === LS_KEYS.checkins) {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      realSetItem(key, value);
    });

    fireEvent.click(button);

    await screen.findByText("저장 공간이 부족해요. 오래된 기록을 정리해주세요");

    setItemSpy.mockRestore();
    expect(readStoredCheckins()).toHaveLength(0);
  });

  it("AC-4[P1]: 메모 시트에서 51자 입력 시 50자로 잘리고, 저장 탭 시 memo 포함 체크인 후 시트가 닫힌다", async () => {
    renderWithRouter(React.createElement(Home));
    await screen.findByTestId("checkin-button");

    fireEvent.click(screen.getByTestId("memo-sheet-open"));
    const dialog = screen.getByRole("dialog");

    const textbox = within(dialog).getByRole("textbox") as HTMLInputElement;
    const long = "가".repeat(51);
    fireEvent.change(textbox, { target: { value: long } });

    expect(textbox.value.length).toBe(50);
    expect(within(dialog).getByText("메모는 50자까지 입력할 수 있어요").textContent).toBe(
      "메모는 50자까지 입력할 수 있어요"
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    const stored = readStoredCheckins();
    expect(stored).toHaveLength(1);
    expect(stored[0].date).toBe(TODAY);
    expect(stored[0].memo).toBe(long.slice(0, 50));
  });

  it("AC-5[P0]: '/' 라우트가 타임아웃 없이 렌더되고 예기치 않은 콘솔 에러가 없다", async () => {
    const profile: Profile = {
      deviceUserId: "heal-1-02-device",
      nickname: "제로소비왕",
      inviteCode: "K3M9QZ",
      roomCode: null,
      onboardedAt: Date.now(),
    };
    writeProfile(profile);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { default: App } = await import("@/App");
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    // 로딩(effect의 microtask)이 실제로 끝나 홈 화면이 안정 상태로 마운트됐는지 확인 —
    // findBy가 내부적으로 act-wrapped 폴링을 하므로 여기서 멈추면(타임아웃) 테스트가 실패한다.
    const button = await screen.findByTestId("checkin-button");
    expect(button).not.toBeNull();
    expect(screen.getByTestId("streak-hero")).not.toBeNull();

    // validateDOMNesting(h1-in-h1)은 이 프로젝트 공용 TDS 목(mocks.ts)의 단순화된
    // Top/TitleParagraph 렌더링 때문에 발생하는 알려진 목 한계이며 모든 페이지에 공통이다
    // (실제 TDS 컴포넌트에서는 발생하지 않음) — 그 외의 콘솔 에러만 실패로 취급한다.
    const unexpected = consoleErrorSpy.mock.calls.filter(
      (args) => !String(args[0]).includes("validateDOMNesting")
    );
    expect(unexpected).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});
