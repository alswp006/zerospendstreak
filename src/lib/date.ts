/**
 * KST(UTC+9) 기준 날짜 유틸. 화면/스토어는 이 함수들만 사용하고 개별 날짜 계산 금지.
 * DateKey 형식: "YYYY-MM-DD" (KST 기준)
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatUTCParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 임의의 Date를 KST 기준 DateKey("YYYY-MM-DD")로 변환 */
export function toDateKey(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return formatUTCParts(kst.getUTCFullYear(), kst.getUTCMonth() + 1, kst.getUTCDate());
}

/** 현재(또는 주어진) 시각의 KST 기준 오늘 DateKey */
export function getTodayKey(date: Date = new Date()): string {
  return toDateKey(date);
}

/** "YYYY-MM-DD" 문자열을 검증하고 UTC 자정 기준 Date로 파싱. 유효하지 않으면 null */
export function parseDateKey(key: string): Date | null {
  if (typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** key에서 days만큼 이동한 DateKey */
export function addDays(key: string, days: number): string {
  const parsed = parseDateKey(key);
  if (!parsed) throw new Error(`Invalid date key: ${key}`);
  const result = new Date(parsed.getTime() + days * DAY_MS);
  return formatUTCParts(result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate());
}

/** to - from (일수) */
export function diffDays(from: string, to: string): number {
  const fromDate = parseDateKey(from);
  const toDate = parseDateKey(to);
  if (!fromDate || !toDate) throw new Error("Invalid date key");
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

/** ISO 8601 주차 키 "YYYY-Www" */
export function getWeekKey(key: string): string {
  const date = parseDateKey(key);
  if (!date) throw new Error(`Invalid date key: ${key}`);

  const target = new Date(date.getTime());
  const dayNr = (target.getUTCDay() + 6) % 7; // 월=0 ... 일=6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // 해당 주의 목요일

  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstThursdayDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNr + 3);

  const weekNumber = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${target.getUTCFullYear()}-W${pad2(weekNumber)}`;
}

/** 해당 연/월의 모든 날짜 DateKey 배열 (month: 1~12) */
export function getMonthDays(year: number, month: number): string[] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(formatUTCParts(year, month, day));
  }
  return days;
}

/** key가 KST 기준 오늘보다 미래인지 */
export function isFuture(key: string, now: Date = new Date()): boolean {
  return key > getTodayKey(now);
}

/** "YYYY-MM-DD" -> "YYYY년 M월 D일" (월/일 zero-pad 없음) */
export function formatKoreanDate(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid date key: ${key}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return `${year}년 ${month}월 ${day}일`;
}
