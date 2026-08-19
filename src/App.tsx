import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { TossAds } from '@apps-in-toss/web-framework';
import { useProfile } from '@/hooks/useProfile';
import Home from '@/pages/Home';
import Onboarding from '@/pages/Onboarding';
import Calendar from '@/pages/Calendar';
import Recover from '@/pages/Recover';
import Stats from '@/pages/Stats';
import Badges from '@/pages/Badges';
import Rank from '@/pages/Rank';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/**
 * 광고 SDK 전역 초기화 — 앱 마운트 시 1회.
 *
 * TDS Provider(TDSMobileAITProvider)와 BrowserRouter는 수정 금지 앵커 파일인 main.tsx가
 * 이미 감싸고 있으므로 여기서 다시 감싸지 않는다(라우터 중첩 = 크래시).
 * WebView 밖(로컬 브라우저·검수자 PC·jsdom)에서는 SDK probe가 false를 반환하는 게 아니라
 * throw하므로 try/catch 없이 호출하면 트리 전체가 언마운트된다(흰 화면).
 */
function useAdSdkBootstrap() {
  useEffect(() => {
    try {
      if (TossAds.initialize.isSupported?.() !== true) return;
      TossAds.initialize({});
    } catch {
      /* 앱인토스 WebView 밖 — 광고 없이 계속 동작 */
    }
  }, []);
}

/**
 * 온보딩 가드 — 프로필의 onboardedAt이 null이면 /onboarding으로 replace 이동.
 *
 * 목적지(/onboarding)에서는 리다이렉트를 판단하지 않는다(무한 루프 방지) — 그래서
 * /onboarding 라우트는 이 가드 바깥에 둔다. useProfile은 ensureProfile()로 동기 생성이라
 * 로딩 대기 상태가 없다.
 */
function RequireOnboarding() {
  const { isOnboarded } = useProfile();
  const location = useLocation();

  if (!isOnboarded && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export default function App() {
  useAdSdkBootstrap();

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />

      <Route element={<RequireOnboarding />}>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/badges" element={<Badges />} />
        <Route path="/rank" element={<Rank />} />
      </Route>

      {DevTdsGallery && (
        <Route
          path="/__tds-gallery"
          element={
            <Suspense fallback={null}>
              <DevTdsGallery />
            </Suspense>
          }
        />
      )}

      {/* 알 수 없는 경로 → 홈. 온보딩 전이면 홈 라우트의 가드가 다시 /onboarding으로 보낸다. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
