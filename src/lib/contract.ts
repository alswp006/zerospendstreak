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
