import { useCallback, useState } from 'react';
import { getBadgeDef } from '@/lib/badgeDefs';
import { readFlags, writeFlags } from '@/lib/storage';
import type { BadgeDef, BadgeId, EarnedBadge } from '@/lib/types';

export interface UseBadgeToastResult {
  /** 아직 알리지 않은 최신 획득 뱃지. 없으면 null → AlertDialog를 닫아 둔다. */
  toastBadge: BadgeDef | null;
  /** 사용자가 확인함 — 같은 뱃지는 다시 알리지 않는다. */
  dismiss: () => void;
}

function latestEarned(earned: EarnedBadge[]): EarnedBadge | null {
  if (!Array.isArray(earned) || earned.length === 0) return null;
  return earned.reduce((newest, item) => (item.earnedAt >= newest.earnedAt ? item : newest));
}

/**
 * 새로 딴 뱃지를 한 번만 알려주는 훅.
 *
 * 확인 여부는 zss.v1.flags의 lastSeenBadgeId에 남기므로, 화면을 다시 열거나
 * 앱을 재시작해도 같은 뱃지로 두 번 알리지 않는다.
 *
 * @AI:NOTE 알림 여부는 렌더 중 파생값으로 계산한다 — effect로 setState하면
 *   뱃지가 뜨는 순간 화면이 한 번 깜빡인다.
 */
export function useBadgeToast(earned: EarnedBadge[]): UseBadgeToastResult {
  const [seenBadgeId, setSeenBadgeId] = useState<BadgeId | null>(() => readFlags().lastSeenBadgeId);

  const latest = latestEarned(earned);
  const toastBadge =
    latest && latest.id !== seenBadgeId ? (getBadgeDef(latest.id) ?? null) : null;

  const dismiss = useCallback(() => {
    if (!toastBadge) return;
    writeFlags({ ...readFlags(), lastSeenBadgeId: toastBadge.id });
    setSeenBadgeId(toastBadge.id);
  }, [toastBadge]);

  return { toastBadge, dismiss };
}
