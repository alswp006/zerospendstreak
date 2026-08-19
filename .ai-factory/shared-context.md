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