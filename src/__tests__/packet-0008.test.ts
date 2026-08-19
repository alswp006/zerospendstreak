import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockTossRewardAd();
mockRouter();

// ── useProfile 훅 목 (Onboarding.tsx는 useProfile만 사용, localStorage 직접 접근 금지) ──
const mockSetNickname = vi.fn();
const mockMarkOnboarded = vi.fn();
const mockProfile = {
  deviceUserId: "device-test-1",
  nickname: "",
  inviteCode: "K3M9QZ",
  roomCode: null,
  onboardedAt: null as number | null,
};

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: mockProfile,
    isOnboarded: mockProfile.onboardedAt !== null,
    setNickname: mockSetNickname,
    markOnboarded: mockMarkOnboarded,
  }),
}));

import Onboarding from "@/pages/Onboarding";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

describe("온보딩 화면 /onboarding", () => {
  beforeEach(() => {
    mockSetNickname.mockReset();
    mockMarkOnboarded.mockReset();
    mockNavigate.mockReset();
    mockProfile.nickname = "";
    mockProfile.onboardedAt = null;
  });

  it("AC-1[P0]: 닉네임 1자 입력 시 시작하기 버튼이 disabled 되고 안내 문구가 노출된다", () => {
    renderWithRouter(React.createElement(Onboarding));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "가" } });

    const startButton = screen.getByTestId("onboarding-start") as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);
    expect(screen.getByText("닉네임을 2~10자로 입력해주세요").textContent).toBe(
      "닉네임을 2~10자로 입력해주세요"
    );
  });

  it("AC-1[P0]: 빈 닉네임에서도 시작하기 버튼은 disabled 상태다", () => {
    renderWithRouter(React.createElement(Onboarding));

    const startButton = screen.getByTestId("onboarding-start") as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);
    expect(screen.getByText("닉네임을 2~10자로 입력해주세요").textContent).toBe(
      "닉네임을 2~10자로 입력해주세요"
    );
  });

  it("AC-2: 11자 입력 시 값이 10자로 차단된다", () => {
    renderWithRouter(React.createElement(Onboarding));

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "가나다라마바사아자차카" } }); // 11자

    expect(input.value.length).toBe(10);
    expect(input.value).toBe("가나다라마바사아자차");
  });

  it("AC-3[P0]: 유효 닉네임으로 시작하기 탭 시 햅틱+프로필 저장+'/' replace 이동", () => {
    mockSetNickname.mockReturnValue({ ok: true });
    renderWithRouter(React.createElement(Onboarding));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "제로소비왕" } }); // 5자, 유효

    const startButton = screen.getByTestId("onboarding-start") as HTMLButtonElement;
    expect(startButton.disabled).toBe(false);

    fireEvent.click(startButton);

    expect(mockSetNickname).toHaveBeenCalledWith("제로소비왕");
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockMarkOnboarded).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("AC-4[P0]: 저장 실패 시 Toast 고지가 노출되고 화면 이동은 없다", () => {
    mockSetNickname.mockReturnValue({ ok: false, reason: "STORAGE_FULL" });
    renderWithRouter(React.createElement(Onboarding));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "제로소비왕" } });

    const startButton = screen.getByTestId("onboarding-start");
    fireEvent.click(startButton);

    expect(screen.getByText("저장 공간이 부족해요. 오래된 기록을 정리해주세요").textContent).toBe(
      "저장 공간이 부족해요. 오래된 기록을 정리해주세요"
    );
    expect(mockMarkOnboarded).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: 유효하지 않은 닉네임(setNickname INVALID_NICKNAME)이면 이동하지 않는다", () => {
    mockSetNickname.mockReturnValue({ ok: false, reason: "INVALID_NICKNAME" });
    renderWithRouter(React.createElement(Onboarding));

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "제로소비왕" } });

    const startButton = screen.getByTestId("onboarding-start");
    fireEvent.click(startButton);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockMarkOnboarded).not.toHaveBeenCalled();
  });
});
