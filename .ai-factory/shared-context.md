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

export type CheckIn = { id: string; date: string; completed: boolean; memo?: string };

export type Badge = { id: string; name: string; description: string; unlockedAt?: string; icon?: string };

export type User = { id: string; nickname: string; targetStreak: number; createdAt: string };

/** 0015의 라우팅 상태관리에서 필수 (구현: 패킷 0001) */
export type RouteState = { route: string; params?: Record<string, any> };

export type BadgeDef = { id: string; name: string; condition: string; tier?: number };

/** 배지 정의 테이블 조회 함수 (구현: 패킷 0002) */
export type BADGE_DEFSFn = () => BadgeDef[];

/** KST 기준 오늘 날짜 (YYYY-MM-DD) (구현: 패킷 0002) */
export type getKSTTodayFn = () => string;

export type formatDateFn = (date: string | Date, format?: 'short' | 'long') => string;

/** 체크인 저장 또는 업데이트 (구현: 패킷 0003) */
export type saveCheckInFn = (checkIn: CheckIn) => Promise<CheckIn>;

export type getCheckInsFn = (startDate: string, endDate: string) => Promise<CheckIn[]>;

export type deleteCheckInFn = (id: string) => Promise<void>;

export type getUserFn = () => Promise<User | null>;

export type saveUserFn = (user: User) => Promise<User>;

/** 현재 스트릭 계산 (연속일 수) (구현: 패킷 0004) */
export type calculateStreakFn = (checkIns: CheckIn[], today: string) => number;

export type calculateStatsFn = (checkIns: CheckIn[]) => { totalDays: number; consistency: number; bestStreak: number };

/** 체크인 이력으로부터 언락된 뱃지 목록 계산 (구현: 패킷 0004) */
export type calculateUnlockedBadgesFn = (checkIns: CheckIn[]) => Badge[];

/** 체크인 상태 및 조작 훅 (구현: 패킷 0005) */
export type useCheckInsFn = () => { checkIns: CheckIn[]; loading: boolean; addCheckIn: (date: string, completed: boolean, memo?: string) => Promise<void>; removeCheckIn: (id: string) => Promise<void> };

export type useBadgesFn = () => { badges: Badge[]; unlockedBadges: Badge[]; loading: boolean };

export type useRecoveryFn = () => { canRecover: boolean; recoveryDaysLeft: number; recover: () => Promise<void> };

export type useProfileFn = () => { user: User | null; updateProfile: (nickname: string, targetStreak: number) => Promise<void>; loading: boolean };

/** 네트워크 격리: 랭킹 데이터 조회 (구현: 패킷 0007) */
export type fetchRankingsFn = (limit?: number) => Promise<Array<{ rank: number; nickname: string; streak: number; badgeCount: number }>>;

/** 여러 페이지에서 재사용되는 빈 상태 컴포넌트 (구현: 패킷 0016) */
export type EmptyStateFn = (props: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) => React.ReactElement;

export type useBadgeToastFn = () => { showBadgeUnlocked: (badge: Badge) => void };

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
    BannerSection.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    EmptyState.tsx
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
    useBadgeToast.ts
    useBadges.ts
    useCheckIns.ts
    useProfile.ts
    useRecovery.ts
  lib/
    badgeDefs.ts
    contract.ts
    date.ts
    engine.ts
    rankApi.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Badges.tsx
    Calendar.tsx
    Home.tsx
    Onboarding.tsx
    Rank.tsx
    Recover.tsx
    Stats.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- badgeDefs.ts: export const BADGE_DEFS: readonly BadgeDef[] = [; export function getBadgeDef(id: string): BadgeDef | undefined
- contract.ts: export type CheckIn =; export type Badge =; export type User =; export type RouteState =; export type BadgeDef =; export type BADGE_DEFSFn = () => BadgeDef[]; export type getKSTTodayFn = () => string; export type formatDateFn = (date: string | Date, format?: 'short' | 'long') => string
- date.ts: export function todayKST(): string; export function addDays(dateStr: string, days: number): string; export function diffDays(a: string, b: string): number; export function isValidDateStr(dateStr: string): boolean; export function formatKorean(dateStr: string): string; export function weekdayKey(dateStr: string): number; export function monthMatrix(year: number, month: number): (string | null)[]
- engine.ts: export function calcStreak(checkins: CheckIn[], today: string): StreakState; export function calcRate( checkins: CheckIn[], today: string, windowDays: number, firstCheckInDate?: string ):; export function calcWeekdayRates(checkins: CheckIn[], today: string): WeekdayRates; export function calcWeeklyTrend(checkins: CheckIn[], today: string):; export function evaluateBadges( currentStreak: number, alreadyEarned: EarnedBadge[], badgeDefs: readonly BadgeDef[], tot; export function canRecover( targetDate: string, today: string, usages: RecoveryUsage[] ):
- rankApi.ts: export type RankApiErrorCode = 'NETWORK' | 'SERVER' | 'ROOM_NOT_FOUND' | 'INVALID_PAYLOAD'; export type RankApiResult = |; export type JoinRoomResult = |; export type FetchRankResult = |; export function isRankEnabled(): boolean; export async function syncStreak( deviceUserId: string, nickname: string, currentStreak: number, bestStreak: number, tot; export async function joinRoom(deviceUserId: string, roomCode: string): Promise<JoinRoomResult>; export async function fetchRank(roomCode: string): Promise<FetchRankResult>
- storage.ts: export const LS_KEYS =; export function readCheckIns(): CheckIn[]; export function writeCheckIns(value: CheckIn[]): boolean; export function readStreak(): StreakState; export function writeStreak(value: StreakState): boolean; export function readRecovery(): RecoveryWallet; export function writeRecovery(value: RecoveryWallet): boolean; export function readBadges(): EarnedBadge[]
- types.ts: export type CheckInSource = 'manual' | 'recovery'; export interface CheckIn; export interface StreakState; export interface RecoveryUsage; export interface RecoveryWallet; export type BadgeId = | 'first_step' // 총 1일 | 'streak_3' // 연속 3일 | 'streak_7' // 연속 7일 | 'streak_14' // 연속 14일 | 'stre; export interface BadgeDef; export interface EarnedBadge
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BannerSection.tsx: BannerSection
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- EmptyState.tsx: EmptyState
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/badgeDefs.ts → imports: lib/types
  lib/engine.ts → imports: lib/types, lib/date
  lib/rankApi.ts → imports: lib/types, lib/storage
  lib/storage.ts → imports: lib/types, lib/date
  pages/Badges.tsx → imports: components/ScreenScaffold, components/Card, components/FloatingTabBar, hooks/useBadges, lib/badgeDefs, lib/types
  pages/Calendar.tsx → imports: components/ScreenScaffold, components/Card, components/StateView, components/FloatingTabBar, hooks/useCheckIns, lib/date, lib/types
  pages/Home.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/CountUp, components/Amount, components/Card, components/EmptyState, components/...
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 정의 (files: src/lib/types.ts)
- 0002: KST 날짜 유틸 + BadgeDef 테이블 (files: src/lib/date.ts, src/lib/badgeDefs.ts, src/lib/__tests__/date.test.ts)
- 0003: localStorage 영속 레이어 (CRUD 전용) (files: src/lib/storage.ts)
- 0004: 스트릭·통계·뱃지 순수 계산 엔진 (files: src/lib/engine.ts, src/lib/__tests__/engine.test.ts)
- 0006: 상태 훅 — useBadges / useRecovery / useProfile (files: src/hooks/useBadges.ts, src/hooks/useRecovery.ts, src/hooks/useProfile.ts)
- 0007: 랭킹 API 클라이언트 (네트워크 격리) (files: src/lib/rankApi.ts)
- 0008: 온보딩 화면 /onboarding (files: src/pages/Onboarding.tsx)
- 0010: 캘린더 화면 /calendar (files: src/pages/Calendar.tsx)
- 0012: 통계 화면 /stats (files: src/pages/Stats.tsx)
- 0013: 뱃지 컬렉션 화면 /badges (files: src/pages/Badges.tsx)
- 0014: 랭킹 화면 /rank (files: src/pages/Rank.tsx)
- 0015: 라우팅 배선 + 온보딩 가드 (App.tsx 단일 소유) (files: src/App.tsx)
- 0016: 광고 배치 컴포넌트 + 검수 컴플라이언스 폴리시 (files: src/components/BannerSection.tsx, src/hooks/useBadgeToast.ts, src/components/EmptyState.tsx)

## TDD 상태
⚠️ TDD 테스트 파일 자동 작성에 실패했습니다. 소스 코드를 작성하기 전에 `src/__tests__/packet-XXXX.test.ts` 파일에 AC 기반 테스트를 먼저 작성하세요 (TDD red phase). 테스트 작성 후 구현하세요.

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/BannerSection.tsx
export function BannerSection({ gap = 24 }: BannerSectionProps = {}) {

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/EmptyState.tsx
export function EmptyState({

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

// src/hooks/useBadgeToast.ts
export interface UseBadgeToastResult {
export function useBadgeToast(earned: EarnedBadge[]): UseBadgeToastResult {

// src/hooks/useBadges.ts
export interface UseBadgesResult {
export function useBadges(): UseBadgesResult {

// src/hooks/useProfile.ts
export type SetNicknameResult = { ok: true } | { ok: false; reason: 'INVALID_NICKNAME' | 'STORAGE_FULL' };
export interface UseProfileResult {
export function useProfile(): UseProfileResult {

// src/hooks/useRecovery.ts
export type EarnTicketResult =
export type UseTicketResult = { ok: true } | { ok: false; reason: 'NO_TICKETS' | 'STORAGE_FULL' };
expo

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(6), testing(1), ui(4)

Key lessons (verify against actual code before applying):
- [deploy] 빌드 불안정 — 의존성 버전 고정, 빌드 전 typecheck 필수 (60%)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60%)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60%)
- [ui] 온보딩/인증 가드는 현재 경로가 목적지 경로와 같으면 리다이렉트를 건너뛰고, 상태 로딩 중에는 리다이렉트를 보류하라 — 그렇지 않으면 무한 루프나 초기 크래시로 전 라우트가 타임아웃된다. (60%)
- [testing] 화면 구현 패킷을 돌리기 전에 플랫폼 SDK·결제/광고 컴포넌트·UI 라이브러리·스토리지 API를 감싼 공유 테스트 목 하네스를 먼저 확정하고, 에이전트가 임시 디버그 테스트 파일을 만들지 못하게 막아라. (60%)