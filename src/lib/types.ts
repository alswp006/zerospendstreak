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
export const StreakState = {} as unknown as StreakState;
export const RecoveryUsage = {} as unknown as RecoveryUsage;
export const RecoveryWallet = {} as unknown as RecoveryWallet;
export const BadgeId = {} as unknown as BadgeId;
export const BadgeDef = {} as unknown as BadgeDef;
export const EarnedBadge = {} as unknown as EarnedBadge;
export const Profile = {} as unknown as Profile;
export const RankEntry = {} as unknown as RankEntry;
export const AppFlags = {} as unknown as AppFlags;
export const ApiError = {} as unknown as ApiError;
export const AddCheckInResult = {} as unknown as AddCheckInResult;
export const RouteState = {} as unknown as RouteState;
