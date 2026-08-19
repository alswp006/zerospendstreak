# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type CheckIn = { id: string; userId: string; date: string; createdAt: string };

export type Badge = { id: string; userId: string; badgeId: string; unlockedAt: string };

export type Profile = { id: string; name: string; avatarUrl?: string; joinedAt: string };

export type BadgeDef = { id: string; name: string; description: string; icon: string; condition: string };

/** Constant array; exported from src/lib/badgeDefs.ts (구현: 패킷 0002) */
export type BADGE_DEFS = readonly BadgeDef[];

export type formatDateKstFn = (date: Date | string) => string;

export type toKstDateFn = (date?: Date) => Date;

export type getCheckInsFn = (userId: string) => CheckIn[];

export type addCheckInFn = (userId: string, date: string) => Promise<CheckIn>;

export type updateProfileFn = (userId: string, updates: Partial<Profile>) => Promise<void>;

export type getBadgesFn = (userId: string) => Badge[];

export type calculateStreakFn = (checkIns: CheckIn[], today?: Date) => { current: number; max: number };

export type calculateStatsFn = (checkIns: CheckIn[]) => { total: number; thisMonth: number; average: number };

export type useCheckInsFn = () => { checkIns: CheckIn[]; addCheckIn: () => Promise<void>; isLoading: boolean };

export type useBadgesFn = () => { badges: Badge[]; unlockedCount: number; isLoading: boolean };

export type useRecoveryFn = () => { canRecover: boolean; recover: () => Promise<void>; cost: number; isLoading: boolean };

export type useProfileFn = () => { profile: Profile; updateProfile: (data: Partial<Profile>) => Promise<void>; isLoading: boolean };

export type RankingEntry = { rank: number; userId: string; name: string; streak: number };

export type fetchRankingFn = (limit?: number) => Promise<RankingEntry[]>;

export type BannerSectionFn = React.FC<{ children?: ReactNode }>;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here
export {};

```

## Known Failure Patterns (from previous attempts — AVOID these)
- TDS component API — read .ai-factory/tds-reference.txt before using TDS
- Turn budget exhausted previously — do the smallest complete change first; do not explore or refactor before the task compiles

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/lib/contract.ts
export type CheckIn = { id: string; userId: string; date: string; createdAt: string };
export type Badge = { id: string; userId: string; badgeId: string; unlockedAt: string };
export type Profile = { id: string; name: string; avatarUrl?: string; joinedAt: string };
export type BadgeDef = { id: string; name: string; description: string; icon: string; condition: string };
export type BADGE_DEFS = readonly BadgeDef[];
export type formatDateKstFn = (date: Date | string) => string;
export type toKstDateFn = (date?: Date) => Date;
export type getCheckInsFn = (userId: string) => CheckIn[];
export type addCheckInFn = (userId: string, date: string) => Promise<CheckIn>;
export type updateProfileFn = (userId: string, updates: Partial<Profile>) => Promise<void>;

// src/lib/storage.ts
e

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(6), testing(1), ui(4)

Key lessons (verify against actual code before applying):
- [deploy] 빌드 불안정 — 의존성 버전 고정, 빌드 전 typecheck 필수 (60%)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60%)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60%)
- [ui] 온보딩/인증 가드는 현재 경로가 목적지 경로와 같으면 리다이렉트를 건너뛰고, 상태 로딩 중에는 리다이렉트를 보류하라 — 그렇지 않으면 무한 루프나 초기 크래시로 전 라우트가 타임아웃된다. (60%)
- [testing] 화면 구현 패킷을 돌리기 전에 플랫폼 SDK·결제/광고 컴포넌트·UI 라이브러리·스토리지 API를 감싼 공유 테스트 목 하네스를 먼저 확정하고, 에이전트가 임시 디버그 테스트 파일을 만들지 못하게 막아라. (60%)