# Sprint Contract — 광고·뱃지·EmptyState 공용 컴포넌트

## 만들 항목
| 파일 | 변경 내용 |
|------|---------|
| `src/components/BannerSection.tsx` | 배너 광고 배치 래퍼 (TossAds.attachBanner 호출 가드, cleanup 자동, try/catch) |
| `src/hooks/useBadgeToast.ts` | 신규 뱃지 획득 → Toast 알림 (EarnedBadge 변화 감지, BADGE_DEFS 참조) |
| `src/components/EmptyState.tsx` | 공통 EmptyState (icon:Asset.ContentIcon, description, weak CTA slot) |

## 공유 타입 (types.ts에서 import)
- `EarnedBadge` — 획득 뱃지 (id, earnedAt)
- `BadgeDef`, `BadgeId` — 뱃지 정의표
- `RecoveryWallet` — 복구권 상태

## 검증 기준
1. **npx tsc --noEmit** — 타입 에러 0
2. **npx vitest run** — 각 훅/컴포넌트 테스트 3~5개 (happy path + edge case)
3. **npm run dev** 후 브라우저: 흰 화면 금지, 광고 throw catch 검증
4. **npm run test:visual** 통과 + e2e/__shots__ 리뷰

## 금지사항
- ❌ App.tsx, main.tsx 수정
- ❌ TDS margin/padding 오버라이드
- ❌ SDK 호출(TossAds 등) try/catch 미적용
- ❌ 기존 src/components 파일 덮어쓰기 (중복 확인)
