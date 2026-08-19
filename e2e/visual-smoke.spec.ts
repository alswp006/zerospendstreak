import { test, expect, type Page } from "@playwright/test";

/**
 * 제네릭 구조 스모크 — 이 앱 지식 없이도 jsdom이 못 보는 렌더 버그를 잡는다:
 *  · 흰 화면(#root 비어있음)        · <button> 안에 <button>(무효 HTML, 예: FixedBottomCTA 안에 Button)
 *  · 빈 입력칸(placeholder 없음)     · 콘솔 에러
 * 픽셀 베이스라인 없음(OS 안정). 각 화면 스크린샷을 e2e/__shots__/에 저장 → 끝내기 전 직접 열어 자가 리뷰.
 *
 * ▶ 이 앱에 맞게 customize:
 *   1) ROUTES에 핵심 화면을 추가(폼/결과/목록/설정 등)
 *   2) 데이터가 필요한 화면은 seed()에서 localStorage를 채워라
 */
const ROUTES: { path: string; name: string }[] = [
  { path: "/onboarding", name: "onboarding" },
  { path: "/", name: "home" },
  { path: "/calendar", name: "calendar" },
  { path: "/recover", name: "recover" },
  { path: "/stats", name: "stats" },
  { path: "/badges", name: "badges" },
  { path: "/rank", name: "rank" },
];

/**
 * localStorage 시드 — 온보딩을 마친 기기 상태를 만든다.
 * 시드가 없으면 온보딩 가드(App.tsx)가 모든 경로를 /onboarding으로 돌려보내
 * 나머지 6개 화면을 한 장도 못 찍는다. 체크인 3건은 캘린더/통계/뱃지가
 * 빈 상태가 아닌 실제 데이터로 그려지게 하려는 것.
 */
async function seed(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const day = 86_400_000;
    const kst = (offsetDays: number) =>
      new Date(Date.now() + 9 * 3600_000 - offsetDays * day).toISOString().slice(0, 10);

    window.localStorage.setItem(
      "zss.v1.profile",
      JSON.stringify({
        deviceUserId: "11111111-2222-4333-8444-555555555555",
        nickname: "제로소비왕",
        inviteCode: "K3M9QZ",
        roomCode: null,
        onboardedAt: 1_700_000_000_000,
      }),
    );
    window.localStorage.setItem(
      "zss.v1.checkins",
      JSON.stringify([
        { date: kst(0), createdAt: 1_700_000_000_000, source: "manual" },
        { date: kst(1), createdAt: 1_700_000_000_000, source: "manual", memo: "장 안 봄" },
        { date: kst(3), createdAt: 1_700_000_000_000, source: "recovery" },
      ]),
    );
    window.localStorage.setItem(
      "zss.v1.recovery",
      JSON.stringify({ tickets: 1, earnedToday: 0, earnedTodayDate: kst(0), usages: [] }),
    );
    window.localStorage.setItem(
      "zss.v1.badges",
      JSON.stringify([{ id: "first_step", earnedAt: 1_700_000_000_000 }]),
    );
  });
}

// 토스 WebView 밖(일반 브라우저)에서만 나는 알려진 dev 에러 — 무시(실기기 WebView엔 안 남)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /getSafeAreaInsets/i];

for (const route of ROUTES) {
  test(`visual smoke: ${route.name} (${route.path})`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" && !IGNORED_CONSOLE.some((re) => re.test(m.text()))) errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await seed(page);
    await page.goto(route.path);
    await page.waitForTimeout(1000); // React 렌더 + effect 정착

    // 1) 흰 화면 방지 — #root에 실제 콘텐츠가 있어야(SDK 가드 누락 시 트리 언마운트 → 흰 화면)
    const rootText = (await page.locator("#root").innerText().catch(() => "")).trim();
    expect(rootText.length, `${route.name}: #root가 비어있음 → 흰 화면`).toBeGreaterThan(0);

    // 2) <button> 안에 <button> 금지 — 무효 HTML. FixedBottomCTA/BottomCTA/CTAButton은 자체가 button이니
    //    안에 Button을 넣지 마라(SubmitFooter는 올바르게 처리됨).
    expect(
      await page.locator("button button").count(),
      `${route.name}: <button> 안에 <button>(무효 HTML — CTA류 안에 Button 중첩)`,
    ).toBe(0);

    // 3) 입력칸은 placeholder가 보여야 — box/line variant는 빈 칸+비포커스에서 라벨이 떠 숨어 빈 회색 박스가 됨
    const inputs = page.getByRole("textbox");
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const ph = (await inputs.nth(i).getAttribute("placeholder")) ?? "";
      expect(ph.trim().length, `${route.name}: 입력칸 #${i}에 placeholder 없음 → 빈 회색 박스`).toBeGreaterThan(0);
    }

    // 4) 콘솔 에러 0 (알려진 dev 에러 제외) — 토스 검수는 console.error 0개 요구
    expect(errors, `${route.name}: 콘솔 에러`).toEqual([]);

    // 5) 스크린샷 저장 → 끝내기 전 직접 열어 자가 리뷰(휑함/솔리드 알약 탭/부유 CTA/앵커 없음)
    await page.screenshot({ path: `e2e/__shots__/${route.name}.png`, fullPage: true });
  });
}
