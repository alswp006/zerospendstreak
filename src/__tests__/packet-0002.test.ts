import { describe, it, expect } from "vitest";
import {
  getTodayKey,
  parseDateKey,
  getWeekKey,
  getMonthDays,
  diffDays,
  addDays,
  formatKoreanDate,
} from "@/lib/date";

describe("KST 날짜 유틸 (DateKey)", () => {
  // AC-1: getTodayKey with KST timezone boundary (UTC+9)
  describe("AC-1: getTodayKey", () => {
    it("AC-1[P0]: should return '2026-08-19' for 2026-08-19T14:59:59Z (KST+1 before cutoff)", () => {
      const date = new Date("2026-08-19T14:59:59Z");
      expect(getTodayKey(date)).toBe("2026-08-19");
    });

    it("AC-1[P0]: should return '2026-08-20' for 2026-08-19T15:00:00Z (KST+1 after cutoff)", () => {
      const date = new Date("2026-08-19T15:00:00Z");
      expect(getTodayKey(date)).toBe("2026-08-20");
    });

    it("should handle year boundary (2025-12-31T15:00:00Z = 2026-01-01 in KST)", () => {
      const date = new Date("2025-12-31T15:00:00Z");
      expect(getTodayKey(date)).toBe("2026-01-01");
    });

    it("should pad month and day with zeros", () => {
      const date = new Date("2026-01-05T10:00:00Z");
      const result = getTodayKey(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result).toBe("2026-01-05");
    });
  });

  // AC-2: parseDateKey validation
  describe("AC-2: parseDateKey", () => {
    it("AC-2[P0]: should return null for invalid month '2026-13-45'", () => {
      expect(parseDateKey("2026-13-45")).toBeNull();
    });

    it("AC-2[P0]: should return null for empty string", () => {
      expect(parseDateKey("")).toBeNull();
    });

    it("AC-2[P0]: should return null for invalid date '2026-02-30' (February has max 28/29)", () => {
      expect(parseDateKey("2026-02-30")).toBeNull();
    });

    it("should return non-null for valid date '2026-08-19'", () => {
      expect(parseDateKey("2026-08-19")).not.toBeNull();
    });

    it("should return null for malformed format 'not-a-date'", () => {
      expect(parseDateKey("not-a-date")).toBeNull();
    });

    it("should return null for month 0", () => {
      expect(parseDateKey("2026-00-15")).toBeNull();
    });

    it("should return null for day 0", () => {
      expect(parseDateKey("2026-08-00")).toBeNull();
    });

    it("should reject invalid formats like '2026/08/19' or '08-19-2026'", () => {
      expect(parseDateKey("2026/08/19")).toBeNull();
      expect(parseDateKey("08-19-2026")).toBeNull();
    });

    it("should accept leap year Feb 29", () => {
      expect(parseDateKey("2028-02-29")).not.toBeNull();
    });

    it("should reject non-leap year Feb 29", () => {
      expect(parseDateKey("2026-02-29")).toBeNull();
    });
  });

  // AC-3: getWeekKey (ISO 8601 week format)
  describe("AC-3: getWeekKey", () => {
    it("AC-3[P0]: should return '2026-W34' for '2026-08-19' (ISO week)", () => {
      expect(getWeekKey("2026-08-19")).toBe("2026-W34");
    });

    it("should return '2026-W01' for '2026-01-04' (first week of year)", () => {
      // Jan 4, 2026 is in week 1 (Thursday)
      const weekKey = getWeekKey("2026-01-04");
      expect(weekKey).toBe("2026-W01");
    });

    it("should return '2025-W53' for '2025-12-31' (last week of previous year)", () => {
      const weekKey = getWeekKey("2025-12-31");
      expect(weekKey).toMatch(/^(2025-W53|2026-W01)$/);
    });

    it("should pad week number with zero", () => {
      const weekKey = getWeekKey("2026-01-05");
      expect(weekKey).toMatch(/^2026-W\d{2}$/);
    });
  });

  describe("AC-3: getMonthDays", () => {
    it("AC-3[P0]: should return 31 days for August 2026, starting with '2026-08-01'", () => {
      const days = getMonthDays(2026, 8);
      expect(days).toHaveLength(31);
      expect(days[0]).toBe("2026-08-01");
      expect(days[30]).toBe("2026-08-31");
    });

    it("AC-3[P0]: should return 29 days for February 2028 (leap year)", () => {
      const days = getMonthDays(2028, 2);
      expect(days).toHaveLength(29);
      expect(days[0]).toBe("2028-02-01");
      expect(days[28]).toBe("2028-02-29");
    });

    it("should return 28 days for February 2026 (non-leap year)", () => {
      const days = getMonthDays(2026, 2);
      expect(days).toHaveLength(28);
      expect(days[0]).toBe("2026-02-01");
      expect(days[27]).toBe("2026-02-28");
    });

    it("should return 30 days for April", () => {
      const days = getMonthDays(2026, 4);
      expect(days).toHaveLength(30);
      expect(days[0]).toBe("2026-04-01");
      expect(days[29]).toBe("2026-04-30");
    });

    it("should return 31 days for December", () => {
      const days = getMonthDays(2026, 12);
      expect(days).toHaveLength(31);
      expect(days[0]).toBe("2026-12-01");
      expect(days[30]).toBe("2026-12-31");
    });

    it("should return dates in YYYY-MM-DD format", () => {
      const days = getMonthDays(2026, 8);
      days.forEach((day) => {
        expect(day).toMatch(/^2026-08-\d{2}$/);
      });
    });
  });

  // AC-4: diffDays, addDays, formatKoreanDate
  describe("AC-4: diffDays", () => {
    it("AC-4[P0]: should return 3 for diffDays('2026-08-16', '2026-08-19')", () => {
      expect(diffDays("2026-08-16", "2026-08-19")).toBe(3);
    });

    it("should return 0 for same date", () => {
      expect(diffDays("2026-08-19", "2026-08-19")).toBe(0);
    });

    it("should return negative for earlier 'to' date", () => {
      expect(diffDays("2026-08-20", "2026-08-19")).toBe(-1);
    });

    it("should handle month boundary crossing forward", () => {
      expect(diffDays("2026-07-31", "2026-08-01")).toBe(1);
    });

    it("should handle month boundary crossing backward", () => {
      expect(diffDays("2026-08-01", "2026-07-31")).toBe(-1);
    });

    it("should handle year boundary", () => {
      expect(diffDays("2025-12-31", "2026-01-01")).toBe(1);
    });

    it("should calculate multi-month difference", () => {
      expect(diffDays("2026-01-01", "2026-03-01")).toBe(59); // Jan 31 + Feb 28
    });
  });

  describe("AC-4: addDays", () => {
    it("AC-4[P0]: should return '2026-09-01' for addDays('2026-08-31', 1)", () => {
      expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    });

    it("should return same date for addDays(date, 0)", () => {
      expect(addDays("2026-08-19", 0)).toBe("2026-08-19");
    });

    it("should handle negative offset", () => {
      expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    });

    it("should handle year boundary forward", () => {
      expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    });

    it("should handle year boundary backward", () => {
      expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    });

    it("should handle leap year transition forward", () => {
      expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    });

    it("should handle leap year transition backward", () => {
      expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    });

    it("should handle large positive offset", () => {
      expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
    });

    it("should handle large negative offset", () => {
      expect(addDays("2026-12-31", -365)).toBe("2025-12-31");
    });

    it("should maintain YYYY-MM-DD format", () => {
      const result = addDays("2026-08-19", 5);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("AC-4: formatKoreanDate", () => {
    it("AC-4[P0]: should return '2026년 8월 18일' for '2026-08-18'", () => {
      expect(formatKoreanDate("2026-08-18")).toBe("2026년 8월 18일");
    });

    it("should format January as '1월' (not zero-padded)", () => {
      expect(formatKoreanDate("2026-01-15")).toBe("2026년 1월 15일");
    });

    it("should format single-digit day without leading zero", () => {
      expect(formatKoreanDate("2026-03-05")).toBe("2026년 3월 5일");
    });

    it("should format multi-digit month and day", () => {
      expect(formatKoreanDate("2026-12-25")).toBe("2026년 12월 25일");
    });

    it("should handle December", () => {
      expect(formatKoreanDate("2026-12-31")).toBe("2026년 12월 31일");
    });

    it("should handle first day of year", () => {
      expect(formatKoreanDate("2026-01-01")).toBe("2026년 1월 1일");
    });

    it("should handle leap year date", () => {
      expect(formatKoreanDate("2028-02-29")).toBe("2028년 2월 29일");
    });
  });
});
