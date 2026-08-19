import type {
  CheckIn,
  StreakState,
  RecoveryWallet,
  EarnedBadge,
  Profile,
  RankEntry,
  AppFlags,
} from '@/lib/types';
import { todayKST } from '@/lib/date';

export const LS_KEYS = {
  checkins: 'zss.v1.checkins',
  streak: 'zss.v1.streak',
  recovery: 'zss.v1.recovery',
  badges: 'zss.v1.badges',
  profile: 'zss.v1.profile',
  rankCache: 'zss.v1.rankCache',
  flags: 'zss.v1.flags',
} as const;

const storage = {
  get<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      storage.set(key, fallback);
      return fallback;
    }
  },
  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};

function defaultStreak(): StreakState {
  return { current: 0, best: 0, lastCheckInDate: null, totalDays: 0 };
}

function defaultRecovery(): RecoveryWallet {
  return { tickets: 0, earnedToday: 0, earnedTodayDate: todayKST(), usages: [] };
}

function defaultFlags(): AppFlags {
  return { onboardingSeen: false, lastSeenBadgeId: null };
}

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function readCheckIns(): CheckIn[] {
  return storage.get<CheckIn[]>(LS_KEYS.checkins, []);
}

export function writeCheckIns(value: CheckIn[]): boolean {
  return storage.set(LS_KEYS.checkins, value);
}

export function readStreak(): StreakState {
  return storage.get<StreakState>(LS_KEYS.streak, defaultStreak());
}

export function writeStreak(value: StreakState): boolean {
  return storage.set(LS_KEYS.streak, value);
}

export function readRecovery(): RecoveryWallet {
  return storage.get<RecoveryWallet>(LS_KEYS.recovery, defaultRecovery());
}

export function writeRecovery(value: RecoveryWallet): boolean {
  return storage.set(LS_KEYS.recovery, value);
}

export function readBadges(): EarnedBadge[] {
  return storage.get<EarnedBadge[]>(LS_KEYS.badges, []);
}

export function writeBadges(value: EarnedBadge[]): boolean {
  return storage.set(LS_KEYS.badges, value);
}

export function readRankCache(): RankEntry[] {
  return storage.get<RankEntry[]>(LS_KEYS.rankCache, []);
}

export function writeRankCache(value: RankEntry[]): boolean {
  return storage.set(LS_KEYS.rankCache, value);
}

export function readFlags(): AppFlags {
  return storage.get<AppFlags>(LS_KEYS.flags, defaultFlags());
}

export function writeFlags(value: AppFlags): boolean {
  return storage.set(LS_KEYS.flags, value);
}

export function readProfile(): Profile {
  const raw = localStorage.getItem(LS_KEYS.profile);
  if (raw === null) return ensureProfile();
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return ensureProfile();
  }
}

export function writeProfile(value: Profile): boolean {
  return storage.set(LS_KEYS.profile, value);
}

export function ensureProfile(): Profile {
  const raw = localStorage.getItem(LS_KEYS.profile);
  if (raw !== null) {
    try {
      return JSON.parse(raw) as Profile;
    } catch {
      // fall through to create a fresh profile below
    }
  }
  const profile: Profile = {
    deviceUserId: generateUuidV4(),
    nickname: '무지출러',
    inviteCode: generateInviteCode(),
    roomCode: null,
    onboardedAt: null,
  };
  storage.set(LS_KEYS.profile, profile);
  return profile;
}
