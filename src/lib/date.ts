// KST(UTC+9) 고정 날짜 유틸 — 기기 시스템 타임존과 무관하게 동일한 결과를 반환한다.
// 모든 날짜 문자열은 'YYYY-MM-DD' 형식의 캘린더 날짜(TZ 없는 값)로 다룬다.
// 순수 함수만 포함. localStorage 접근 없음.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function parseDateStr(dateStr: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** dateStr을 UTC 자정 timestamp(ms)로 변환. 캘린더 날짜 연산의 기준값. */
function toUtcMidnight(dateStr: string): number {
  const parts = parseDateStr(dateStr);
  if (!parts) throw new Error(`Invalid date string: ${dateStr}`);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

/** UTC timestamp(ms)로부터 'YYYY-MM-DD' 문자열 생성. */
function fromUtcMidnight(ts: number): string {
  const d = new Date(ts);
  return formatDateStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** 현재 시각을 KST 기준 'YYYY-MM-DD'로 반환. 시스템 타임존과 무관(UTC 시각 + 9시간 고정 오프셋). */
export function todayKST(): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  return formatDateStr(kstNow.getUTCFullYear(), kstNow.getUTCMonth() + 1, kstNow.getUTCDate());
}

/** dateStr에 days일을 더한 'YYYY-MM-DD' 반환(음수 가능, 월/연 경계 자동 처리). */
export function addDays(dateStr: string, days: number): string {
  return fromUtcMidnight(toUtcMidnight(dateStr) + days * DAY_MS);
}

/** a - b (일 단위). a가 더 미래 날짜면 양수. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtcMidnight(a) - toUtcMidnight(b)) / DAY_MS);
}

/** 'YYYY-MM-DD' 형식 + 실존하는 캘린더 날짜인지 검증(예: 2026-02-30 → false). */
export function isValidDateStr(dateStr: string): boolean {
  const parts = parseDateStr(dateStr);
  if (!parts) return false;
  const { year, month, day } = parts;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** 'YYYY년 M월 D일' 한글 포맷. */
export function formatKorean(dateStr: string): string {
  const parts = parseDateStr(dateStr);
  if (!parts) return dateStr;
  return `${parts.year}년 ${parts.month}월 ${parts.day}일`;
}

/** 캘린더 날짜의 요일 인덱스(0=일 ~ 6=토) 반환. 시스템 TZ 무관. */
export function weekdayKey(dateStr: string): number {
  const parts = parseDateStr(dateStr);
  if (!parts) throw new Error(`Invalid date string: ${dateStr}`);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/**
 * year/month(1~12)의 달력 매트릭스를 7의 배수 셀 배열로 반환한다.
 * 각 셀은 'YYYY-MM-DD' 또는 선행/후행 패딩용 null.
 */
export function monthMatrix(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(formatDateStr(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}
