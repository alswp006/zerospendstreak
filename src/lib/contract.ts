/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type CheckIn = { id: string; date: DateKey; memo?: string; createdAt: string };

export type Badge = { id: string; name: string; description: string; unlockedAt?: string; icon?: string };

export type RecoveryTicket = { id: string; availableCount: number; lastUsedAt?: string };

export type UserProfile = { id: string; nickname: string; avatar?: string; joinedAt: string };

export type Stats = { totalCheckIns: number; currentStreak: number; longestStreak: number; lastCheckInDate?: DateKey };

/** "YYYY-MM-DD" format in KST timezone (구현: 패킷 0002) */
export type DateKey = string;

export type RankingEntry = { userId: string; nickname: string; streak: number; rank: number };

export type FriendGroup = { id: string; name: string; members: UserProfile[] };

export type Route = 'home' | 'streak' | 'stats' | 'badges' | 'ranking' | 'onboarding';

export type Reward = { type: 'badge' | 'ticket' | 'points'; amount?: number; badgeId?: string };

export type getCurrentDateKeyFn = () => DateKey;

export type parseDateKeyFn = (key: string) => Date | null;

export type calculateStreakFn = (checkIns: CheckIn[]) => number;

export type evaluateBadgesFn = (stats: Stats) => Badge[];

export type calculateStatsFn = (checkIns: CheckIn[]) => Stats;

export type getRankingFn = () => Promise<RankingEntry[]>;

export type useAppStoreFn = () => { checkIns: CheckIn[]; badges: Badge[]; stats: Stats; userProfile: UserProfile; recoveryTickets: RecoveryTicket[]; addCheckIn: (memo?: string) => Promise<void> };

export type useTossIntegrationFn = () => { isConnected: boolean; userId?: string; connect: () => Promise<void> };

export type useNavigationFn = () => { navigate: (route: Route) => void; currentRoute: Route };

export type validatePromotionFn = (code: string) => Promise<boolean>;
