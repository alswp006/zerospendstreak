// 스트릭·통계·뱃지 순수 계산 엔진 — I/O 없음(localStorage/Date.now() 접근 금지).
// 호출자가 오늘 날짜('YYYY-MM-DD')와 시각(epoch ms)을 인자로 넘긴다.

import type { CheckIn, StreakState, BadgeDef, EarnedBadge, RecoveryUsage } from '@/lib/types';
import { addDays, diffDays, weekdayKey } from '@/lib/date';

const WEEKDAY_KEYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
type WeekdayKey = (typeof WEEKDAY_KEYS)[number];
type WeekdayRates = Record<WeekdayKey, number>;

function emptyWeekdayRates(): WeekdayRates {
  return { SUN: 0, MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0, SAT: 0 };
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/** 체크인 목록으로부터 현재/최고 연속일수를 계산한다. today와 마지막 체크인 사이 gap이 1일 이하면 현재 연속으로 인정(오늘 아직 체크인 전인 유예). */
export function calcStreak(checkins: CheckIn[], today: string): StreakState {
  const dates = Array.from(new Set(checkins.map((c) => c.date))).sort();
  if (dates.length === 0) {
    return { current: 0, best: 0, lastCheckInDate: null, totalDays: 0 };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    if (diffDays(dates[i], dates[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
  }

  const lastCheckInDate = dates[dates.length - 1];
  const gapFromToday = diffDays(today, lastCheckInDate);
  const current = gapFromToday <= 1 ? run : 0;

  return { current, best, lastCheckInDate, totalDays: dates.length };
}

/** windowDays 기간 내 체크인 비율(%, 소수 1자리). firstCheckInDate가 주어지면 계정 나이로 window를 축소. */
export function calcRate(
  checkins: CheckIn[],
  today: string,
  windowDays: number,
  firstCheckInDate?: string
): { rate: number } {
  if (checkins.length === 0) return { rate: 0 };

  let effectiveWindow = windowDays;
  if (firstCheckInDate) {
    const accountAge = diffDays(today, firstCheckInDate) + 1;
    effectiveWindow = Math.min(windowDays, Math.max(accountAge, 1));
  }

  const windowStart = addDays(today, -(effectiveWindow - 1));
  const uniqueDates = new Set(checkins.map((c) => c.date));
  let count = 0;
  uniqueDates.forEach((date) => {
    if (date >= windowStart && date <= today) count += 1;
  });

  return { rate: toPercent(count, effectiveWindow) };
}

/** 최초 체크인일부터 today까지, 요일별 성공률(%)을 계산한다. */
export function calcWeekdayRates(checkins: CheckIn[], today: string): WeekdayRates {
  if (checkins.length === 0) return emptyWeekdayRates();

  const uniqueDates = Array.from(new Set(checkins.map((c) => c.date)));
  const checkinSet = new Set(uniqueDates);
  const startDate = uniqueDates.reduce((min, d) => (d < min ? d : min), uniqueDates[0]);
  const totalDays = Math.max(diffDays(today, startDate) + 1, 0);

  const occurrences: Record<WeekdayKey, number> = emptyWeekdayRates();
  const successes: Record<WeekdayKey, number> = emptyWeekdayRates();

  for (let i = 0; i < totalDays; i++) {
    const d = addDays(startDate, i);
    const key = WEEKDAY_KEYS[weekdayKey(d)];
    occurrences[key] += 1;
    if (checkinSet.has(d)) successes[key] += 1;
  }

  const result = emptyWeekdayRates();
  WEEKDAY_KEYS.forEach((key) => {
    result[key] = toPercent(successes[key], occurrences[key]);
  });
  return result;
}

/** today를 포함한 최근 8주(각 7일)의 체크인 개수 추이. 오래된 주 → 최근 주 순서. */
export function calcWeeklyTrend(checkins: CheckIn[], today: string): { weekStart: string; count: number }[] {
  const dates = new Set(checkins.map((c) => c.date));
  const weeks: { weekStart: string; count: number }[] = [];

  for (let w = 7; w >= 0; w--) {
    const weekEnd = addDays(today, -7 * w);
    const weekStart = addDays(weekEnd, -6);
    let count = 0;
    for (let i = 0; i < 7; i++) {
      if (dates.has(addDays(weekStart, i))) count += 1;
    }
    weeks.push({ weekStart, count });
  }

  return weeks;
}

/**
 * 신규 획득 뱃지만 반환한다(이미 획득한 뱃지는 제외).
 * totalDays 미지정 시 currentStreak로 대체(총 일수는 항상 연속일수 이상이라는 성질을 이용한 보수적 기본값).
 * earnedAt은 호출자가 넘긴 now(epoch ms)를 그대로 쓴다 — 파일 내부에서 Date.now()를 호출하지 않는다.
 */
export function evaluateBadges(
  currentStreak: number,
  alreadyEarned: EarnedBadge[],
  badgeDefs: readonly BadgeDef[],
  totalDays: number = currentStreak,
  now: number = 1
): EarnedBadge[] {
  const earnedIds = new Set(alreadyEarned.map((b) => b.id));
  const newlyEarned: EarnedBadge[] = [];

  for (const def of badgeDefs) {
    if (earnedIds.has(def.id)) continue;
    if (def.kind === 'streak' && currentStreak >= def.threshold) {
      newlyEarned.push({ id: def.id, earnedAt: now });
    } else if (def.kind === 'total' && totalDays >= def.threshold) {
      newlyEarned.push({ id: def.id, earnedAt: now });
    }
    // 'event' kind(comeback 등)는 임계값이 아닌 명시적 트리거로 별도 지급 — 여기서 판단하지 않음
  }

  return newlyEarned;
}

/** targetDate 복구 가능 여부. today와의 간격이 7일 이하이고 이미 복구된 날짜가 아니어야 한다. */
export function canRecover(
  targetDate: string,
  today: string,
  usages: RecoveryUsage[]
): { ok: boolean; reason?: 'TOO_OLD' | 'ALREADY_RECOVERED' } {
  const gap = diffDays(today, targetDate);
  if (gap > 7) {
    return { ok: false, reason: 'TOO_OLD' };
  }
  if (usages.some((u) => u.recoveredDate === targetDate)) {
    return { ok: false, reason: 'ALREADY_RECOVERED' };
  }
  return { ok: true };
}
