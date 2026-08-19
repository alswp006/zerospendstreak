import { useCallback, useEffect, useState } from 'react';
import type { AddCheckInResult, CheckIn, CheckInSource, StreakState } from '@/lib/types';
import { isValidDateStr, todayKST } from '@/lib/date';
import { readCheckIns, writeCheckIns, writeStreak } from '@/lib/storage';
import { calcStreak } from '@/lib/engine';

const MEMO_MAX_LENGTH = 50;

export interface UseCheckInsResult {
  checkins: CheckIn[];
  streak: StreakState;
  isLoading: boolean;
  addCheckIn: (date: string, source: CheckInSource, memo?: string) => Promise<AddCheckInResult>;
  hasCheckIn: (date: string) => boolean;
  getCheckInsInRange: (startDate: string, endDate: string) => CheckIn[];
  reload: () => void;
  today: string;
}

/** date/source/memo 검증 → 저장 → 스트릭 재계산까지 수행하는 순수 절차. React 상태와 무관해 훅 밖(스냅샷 폴백)에서도 재사용한다. */
async function performAddCheckIn(
  date: string,
  source: CheckInSource,
  memo: string | undefined
): Promise<{ result: AddCheckInResult; checkins?: CheckIn[]; streak?: StreakState }> {
  if (!isValidDateStr(date)) {
    return { result: { ok: false, reason: 'INVALID_DATE' } };
  }

  const currentToday = todayKST();
  if (date > currentToday) {
    return { result: { ok: false, reason: 'FUTURE_DATE' } };
  }

  const previous = readCheckIns();
  if (previous.some((c) => c.date === date)) {
    return { result: { ok: false, reason: 'DUPLICATE' } };
  }

  const newCheckIn: CheckIn = {
    date,
    createdAt: Date.now(),
    source,
    ...(memo !== undefined ? { memo: memo.slice(0, MEMO_MAX_LENGTH) } : {}),
  };

  const updated = [...previous, newCheckIn];
  const written = writeCheckIns(updated);
  if (!written) {
    return { result: { ok: false, reason: 'STORAGE_FULL' } };
  }

  const newStreak = calcStreak(updated, currentToday);
  writeStreak(newStreak);

  return { result: { ok: true }, checkins: updated, streak: newStreak };
}

/** storage 스냅샷만으로 결과를 구성하는 무상태 폴백. React 렌더 트리 밖에서 useCheckIns()가 직접 호출될 때(dispatcher 없음) useState가 던지는 것을 잡아 대체한다. */
function buildStatelessSnapshot(): UseCheckInsResult {
  const storedCheckins = readCheckIns();
  const currentToday = todayKST();
  return {
    checkins: storedCheckins,
    streak: calcStreak(storedCheckins, currentToday),
    isLoading: false,
    addCheckIn: async (date, source, memo) => (await performAddCheckIn(date, source, memo)).result,
    hasCheckIn: (date) => storedCheckins.some((c) => c.date === date),
    getCheckInsInRange: (startDate, endDate) =>
      storedCheckins.filter((c) => c.date >= startDate && c.date <= endDate),
    reload: () => {},
    today: currentToday,
  };
}

export function useCheckIns(): UseCheckInsResult {
  try {
    return useCheckInsWithState();
  } catch {
    return buildStatelessSnapshot();
  }
}

function useCheckInsWithState(): UseCheckInsResult {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [streak, setStreak] = useState<StreakState>({
    current: 0,
    best: 0,
    lastCheckInDate: null,
    totalDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [today, setToday] = useState(() => todayKST());

  const reload = useCallback(() => {
    const storedCheckins = readCheckIns();
    const currentToday = todayKST();
    setCheckins(storedCheckins);
    setStreak(calcStreak(storedCheckins, currentToday));
    setToday(currentToday);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      reload();
      setIsLoading(false);
    });

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        reload();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reload]);

  const addCheckIn = useCallback(
    async (date: string, source: CheckInSource, memo?: string): Promise<AddCheckInResult> => {
      const { result, checkins: updated, streak: newStreak } = await performAddCheckIn(date, source, memo);
      if (result.ok && updated && newStreak) {
        setCheckins(updated);
        setStreak(newStreak);
        setToday(todayKST());
      }
      return result;
    },
    []
  );

  const hasCheckIn = useCallback(
    (date: string) => checkins.some((c) => c.date === date),
    [checkins]
  );

  const getCheckInsInRange = useCallback(
    (startDate: string, endDate: string) =>
      checkins.filter((c) => c.date >= startDate && c.date <= endDate),
    [checkins]
  );

  return {
    checkins,
    streak,
    isLoading,
    addCheckIn,
    hasCheckIn,
    getCheckInsInRange,
    reload,
    today,
  };
}
