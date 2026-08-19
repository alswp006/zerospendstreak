import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import { render } from "@testing-library/react";

import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Profile } from "@/lib/types";

// NOTE: react-router-dom is intentionally NOT mocked here (mockRouter() is skipped) —
// App.tsx's own routing/guard logic must react to the *real* MemoryRouter location,
// which the shared mockLocation stub (fixed at "/") would break.
mockTds();
mockAppsInToss();
mockTossRewardAd();

// ── page stubs — Calendar/Recover/Stats/Badges 화면은 이 패킷 시점에 아직 구현되지
// 않았을 수 있다. App.tsx는 라우팅 배선만 검증 대상이므로 각 페이지를 얇은 마커로
// 대체해 페이지 내부 구현(추후 별도 패킷)과 결합도를 없앤다. ──
vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "Home"),
}));
vi.mock("@/pages/Onboarding", () => ({
  default: () => React.createElement("div", { "data-testid": "page-onboarding" }, "Onboarding"),
}));
vi.mock("@/pages/Calendar", () => ({
  default: () => React.createElement("div", { "data-testid": "page-calendar" }, "Calendar"),
}));
vi.mock("@/pages/Recover", () => ({
  default: () => React.createElement("div", { "data-testid": "page-recover" }, "Recover"),
}));
vi.mock("@/pages/Stats", () => ({
  default: () => React.createElement("div", { "data-testid": "page-stats" }, "Stats"),
}));
vi.mock("@/pages/Badges", () => ({
  default: () => React.createElement("div", { "data-testid": "page-badges" }, "Badges"),
}));
vi.mock("@/pages/Rank", () => ({
  default: () => React.createElement("div", { "data-testid": "page-rank" }, "Rank"),
}));

// ── useProfile — onboardedAt을 테스트별로 뒤바꿔 온보딩 가드를 검증한다 ──
let currentProfile: Profile = {
  deviceUserId: "device-test-1",
  nickname: "제로소비왕",
  inviteCode: "K3M9QZ",
  roomCode: null,
  onboardedAt: Date.now(),
};

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: currentProfile,
    isOnboarded: currentProfile.onboardedAt !== null,
    setNickname: vi.fn(),
    markOnboarded: vi.fn(),
  }),
}));

import App from "@/App";

const ONBOARDED_PROFILE: Profile = {
  deviceUserId: "device-test-1",
  nickname: "제로소비왕",
  inviteCode: "K3M9QZ",
  roomCode: null,
  onboardedAt: 1_700_000_000_000,
};
const NOT_ONBOARDED_PROFILE: Profile = { ...ONBOARDED_PROFILE, onboardedAt: null };

const ROUTES: Array<{ path: string; testId: string }> = [
  { path: "/", testId: "page-home" },
  { path: "/onboarding", testId: "page-onboarding" },
  { path: "/calendar", testId: "page-calendar" },
  { path: "/recover", testId: "page-recover" },
  { path: "/stats", testId: "page-stats" },
  { path: "/badges", testId: "page-badges" },
  { path: "/rank", testId: "page-rank" },
];

describe("라우팅 배선 + 온보딩 가드 (App.tsx 단일 소유)", () => {
  beforeEach(() => {
    currentProfile = { ...ONBOARDED_PROFILE };
  });

  it("AC-1[P0]: renders the matching page for each of the 7 defined routes without crashing", () => {
    for (const { path: routePath, testId } of ROUTES) {
      const { container, unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [routePath],
      });
      expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull();
      expect(container.querySelector(`[data-testid="${testId}"]`)?.textContent).toBeTruthy();
      unmount();
    }
  });

  it("AC-1[P0]: each route renders exactly one page marker (no ambiguous/overlapping matches)", () => {
    for (const { path: routePath, testId } of ROUTES) {
      const { container, unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [routePath],
      });
      const rendered = container.querySelectorAll('[data-testid^="page-"]');
      expect(rendered.length).toBe(1);
      expect(rendered[0].getAttribute("data-testid")).toBe(testId);
      unmount();
    }
  });

  it("AC-2[P0]: redirects '/' to /onboarding when onboardedAt is null", () => {
    currentProfile = NOT_ONBOARDED_PROFILE;
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/"],
    });
    expect(container.querySelector('[data-testid="page-onboarding"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="page-home"]')).toBeNull();
  });

  it("AC-2[P0]: renders '/' normally once onboarding is complete", () => {
    currentProfile = ONBOARDED_PROFILE;
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/"],
    });
    expect(container.querySelector('[data-testid="page-home"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="page-onboarding"]')).toBeNull();
  });

  it("AC-3: redirects unknown paths to '/'", () => {
    currentProfile = ONBOARDED_PROFILE;
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/this-route-does-not-exist"],
    });
    expect(container.querySelector('[data-testid="page-home"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="page-onboarding"]')).toBeNull();
  });

  it("AC-4: src/main.tsx stays byte-identical to the committed anchor file (0-line diff)", () => {
    const repoRoot = process.cwd();
    const mainTsxPath = path.join(repoRoot, "src/main.tsx");
    const workingCopy = fs.readFileSync(mainTsxPath, "utf-8");
    const committedCopy = execSync("git show HEAD:src/main.tsx", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    expect(workingCopy).toBe(committedCopy);
    expect(workingCopy).toContain(["@AI", "ANCHOR"].join(":"));
  });

  it("AC-5: App.tsx wires routing through react-router-dom, never Next.js APIs", () => {
    const appTsxPath = path.join(process.cwd(), "src/App.tsx");
    const source = fs.readFileSync(appTsxPath, "utf-8");
    expect(source).toContain("react-router-dom");
    expect(source).not.toContain("next/router");
    expect(source).not.toContain("getServerSideProps");
  });
});
