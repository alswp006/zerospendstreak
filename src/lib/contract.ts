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
