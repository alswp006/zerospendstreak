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

import type { ReactNode } from 'react';

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
// Domain types — ZeroSpendStreak

export type CheckInSource = 'manual' | 'recovery';

export interface CheckIn {
  /** KST 기준 'YYYY-MM-DD' — 고유 키 */
  date: string;
  /** 체크인 저장 시각 (epoch ms) */
  createdAt: number;
  /** 'manual' = 사용자가 직접 체크인, 'recovery' = 복구권으로 메꾼 날 */
  source: CheckInSource;
  /** 선택 메모, 최대 50자 */
  memo?: string;
}

export interface StreakState {
  /** 현재 연속 성공일수 */
  current: number;
  /** 역대 최고 연속 성공일수 */
  best: number;
  /** 마지막 체크인 날짜 'YYYY-MM-DD' | null */
  lastCheckInDate: string | null;
  /** 총 무지출 일수 (recovery 포함) */
  totalDays: number;
}

export interface RecoveryUsage {
  /** 복구한 대상 날짜 'YYYY-MM-DD' */
  recoveredDate: string;
  /** 사용 시각 epoch ms */
  usedAt: number;
}

export interface RecoveryWallet {
  /** 보유 복구권 수, 0~3 */
  tickets: number;
  /** 오늘(KST) 광고로 획득한 복구권 수, 일일 상한 1 */
  earnedToday: number;
  /** earnedToday 기준 날짜 'YYYY-MM-DD' */
  earnedTodayDate: string;
  /** 복구권 사용 이력 */
  usages: RecoveryUsage[];
}

export type BadgeId =
  | 'first_step' // 총 1일
  | 'streak_3' // 연속 3일
  | 'streak_7' // 연속 7일
  | 'streak_14' // 연속 14일
  | 'streak_30' // 연속 30일
  | 'streak_60' // 연속 60일
  | 'streak_100' // 연속 100일
  | 'total_50' // 누적 50일
  | 'comeback'; // 복구권 최초 사용

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  /** 'streak' | 'total' | 'event' */
  kind: 'streak' | 'total' | 'event';
  /** streak/total 기준값. event는 0 */
  threshold: number;
}

export interface EarnedBadge {
  id: BadgeId;
  /** 획득 시각 epoch ms */
  earnedAt: number;
}

export interface Profile {
  /** UUID v4, 앱 최초 실행 시 생성 */
  deviceUserId: string;
  /** 랭킹 표시 닉네임, 2~10자 */
  nickname: string;
  /** 본인 초대 코드, 6자 대문자 영숫자 (예: 'K3M9QZ') */
  inviteCode: string;
  /** 참여 중인 랭킹방 코드 | null */
  roomCode: string | null;
  /** 온보딩 고지 확인 여부 */
  onboardedAt: number | null;
}

export interface RankEntry {
  userId: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  /** 1부터 시작하는 순위 */
  rank: number;
}

export interface AppFlags {
  onboardingSeen: boolean;
  lastSeenBadgeId: BadgeId | null;
}

export interface ApiError {
  /** 에러 코드: INVALID_PAYLOAD, ROOM_NOT_FOUND 등 */
  error: string;
}

export type AddCheckInResult =
  | { ok: true }
  | { ok: false; reason: 'FUTURE_DATE' | 'DUPLICATE' | 'INVALID_DATE' | 'STORAGE_FULL' };

export interface RouteState {
  '/': undefined;
  '/calendar': { focusDate?: string } | undefined;
  '/recover': { targetDate: string } | undefined;
  '/stats': undefined;
  '/badges': { highlightBadgeId?: BadgeId } | undefined;
  '/rank': undefined;
}

// Type/interface declarations above are erased at compile time and leave no
// runtime binding. Vitest's `import("@/lib/types")` needs an actual value
// per export name, so each type gets a same-named value-space companion
// (type-space and value-space names don't collide in TS).
export const CheckInSource = {} as unknown as CheckInSource;
export const CheckIn = {} as unknown as CheckIn;
expo
// ...truncated
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
    contract.ts
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
- contract.ts: export type CheckIn =; export type Badge =; export type Profile =; export type BadgeDef =; export type BADGE_DEFS = readonly BadgeDef[]; export type formatDateKstFn = (date: Date | string) => string; export type toKstDateFn = (date?: Date) => Date; export type getCheckInsFn = (userId: string) => CheckIn[]
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type CheckInSource = 'manual' | 'recovery'; export interface CheckIn; export interface StreakState; export interface RecoveryUsage; export interface RecoveryWallet; export type BadgeId = | 'first_step' // 총 1일 | 'streak_3' // 연속 3일 | 'streak_7' // 연속 7일 | 'streak_14' // 연속 14일 | 'stre; export interface BadgeDef; export interface EarnedBadge
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

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 정의 (files: src/lib/types.ts)