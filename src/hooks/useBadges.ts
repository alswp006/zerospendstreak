import { useCallback, useState } from 'react';
import type { EarnedBadge } from '@/lib/types';
import { readBadges, writeBadges } from '@/lib/storage';
import { evaluateBadges } from '@/lib/engine';
import { BADGE_DEFS } from '@/lib/badgeDefs';

const VALID_BADGE_IDS = new Set<string>(BADGE_DEFS.map((def) => def.id));

/** 알 수 없는(구버전/오염) BadgeId를 제거한다 — 스토리지가 손상돼도 화면이 죽지 않도록. */
function filterValid(badges: EarnedBadge[]): EarnedBadge[] {
  return badges.filter((b) => VALID_BADGE_IDS.has(b.id));
}

export interface UseBadgesResult {
  earned: EarnedBadge[];
  checkAndGrant: (currentStreak: number, totalDays: number) => { granted: EarnedBadge[] };
  grantBadges: (badges: EarnedBadge[]) => boolean;
}

export function useBadges(): UseBadgesResult {
  const [earned, setEarned] = useState<EarnedBadge[]>(() => filterValid(readBadges()));

  const grantBadges = useCallback((badges: EarnedBadge[]): boolean => {
    if (badges.length === 0) return true;
    const merged = [...filterValid(readBadges()), ...badges];
    const written = writeBadges(merged);
    if (!written) return false;
    setEarned(merged);
    return true;
  }, []);

  const checkAndGrant = useCallback(
    (currentStreak: number, totalDays: number): { granted: EarnedBadge[] } => {
      const current = filterValid(readBadges());
      const granted = evaluateBadges(currentStreak, current, BADGE_DEFS, totalDays, Date.now());
      if (granted.length > 0) {
        grantBadges(granted);
      }
      return { granted };
    },
    [grantBadges]
  );

  return { earned, checkAndGrant, grantBadges };
}
