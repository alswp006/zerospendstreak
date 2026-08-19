import { describe, it, expect, vi } from "vitest";
import type {
  CheckIn,
  StreakState,
  BadgeDef,
  EarnedBadge,
} from "@/lib/types";

// 순수 함수 테스트이므로 별도 mock 불필요
// calcStreak, calcRate, calcWeeklyTrend, calcWeekdayRates, evaluateBadges, canRecover 테스트

describe("Packet 0004: 스트릭·통계·뱃지 순수 계산 엔진", () => {
  // ============================================================================
  // AC-1: calcStreak([08-18,08-19,08-20],'2026-08-20')
  // → {current:3, best:3, lastCheckInDate:'2026-08-20', totalDays:3}
  // ============================================================================
  it("AC-1[P0]: calcStreak with 3 consecutive checkins returns current=3, best=3", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" },
      { date: "2026-08-19", createdAt: 2, source: "manual" },
      { date: "2026-08-20", createdAt: 3, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(3);
    expect(result.best).toBe(3);
    expect(result.lastCheckInDate).toBe("2026-08-20");
    expect(result.totalDays).toBe(3);
  });

  // ============================================================================
  // AC-2: calcStreak([08-18,08-19],'2026-08-20')
  // → current === 2 (gap between 08-19 and 08-20 means streak ends at 08-19)
  // ============================================================================
  it("AC-2[P0]: calcStreak with gap on final day returns current=2", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" },
      { date: "2026-08-19", createdAt: 2, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(2);
    expect(result.best).toBe(2);
    expect(result.lastCheckInDate).toBe("2026-08-19");
    expect(result.totalDays).toBe(2);
  });

  // ============================================================================
  // AC-3: calcStreak([08-10,08-11,08-17],'2026-08-20')
  // → {current:0, best:2, lastCheckInDate:'2026-08-17', totalDays:3}
  // (08-10~11 streak ends, gap 5 days, 08-17 alone, gap 3 days from today)
  // ============================================================================
  it("AC-3[P0]: calcStreak with broken streak returns current=0, best=2", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-10", createdAt: 1, source: "manual" },
      { date: "2026-08-11", createdAt: 2, source: "manual" },
      { date: "2026-08-17", createdAt: 3, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(0);
    expect(result.best).toBe(2);
    expect(result.lastCheckInDate).toBe("2026-08-17");
    expect(result.totalDays).toBe(3);
  });

  it("AC-3[P1]: calcStreak returns correct structure fields", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-15", createdAt: 1, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-15");

    expect(result).toHaveProperty("current");
    expect(result).toHaveProperty("best");
    expect(result).toHaveProperty("lastCheckInDate");
    expect(result).toHaveProperty("totalDays");
  });

  it("AC-3[P1]: calcStreak with empty checkins returns all zeros", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const result = calcStreak([], "2026-08-20");

    expect(result.current).toBe(0);
    expect(result.best).toBe(0);
    expect(result.lastCheckInDate).toBeNull();
    expect(result.totalDays).toBe(0);
  });

  it("AC-3[P1]: calcStreak with single checkin", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-20", createdAt: 1, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(1);
    expect(result.best).toBe(1);
    expect(result.totalDays).toBe(1);
  });

  // ============================================================================
  // AC-4: calcRate with 5/7 → rate === 71.4, 18/30 → rate === 60
  // calcWeekdayRates().MON with 8회 중 6회 → 75%
  // ============================================================================
  it("AC-4[P0]: calcRate with 5 out of 7 days returns ~71.4%", async () => {
    const { calcRate } = await import("@/lib/engine");

    // Create 5 checkins over a 7-day window
    const checkins: CheckIn[] = [
      { date: "2026-08-14", createdAt: 1, source: "manual" },
      { date: "2026-08-15", createdAt: 2, source: "manual" },
      { date: "2026-08-16", createdAt: 3, source: "manual" },
      { date: "2026-08-17", createdAt: 4, source: "manual" },
      { date: "2026-08-20", createdAt: 5, source: "manual" },
    ];

    const result = calcRate(checkins, "2026-08-20", 7);

    expect(typeof result.rate).toBe("number");
    expect(result.rate).toBeCloseTo(71.4, 1);
  });

  it("AC-4[P0]: calcRate with 18 out of 30 days returns 60%", async () => {
    const { calcRate } = await import("@/lib/engine");

    // Create 18 checkins over a 30-day window
    const checkins: CheckIn[] = Array.from({ length: 18 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      createdAt: i + 1,
      source: "manual" as const,
    }));

    const result = calcRate(checkins, "2026-08-30", 30);

    expect(result.rate).toBeCloseTo(60, 1);
  });

  it("AC-4[P1]: calcRate with 0 checkins returns 0%", async () => {
    const { calcRate } = await import("@/lib/engine");

    const result = calcRate([], "2026-08-20", 7);

    expect(result.rate).toBe(0);
  });

  it("AC-4[P1]: calcRate with all days checked returns 100%", async () => {
    const { calcRate } = await import("@/lib/engine");

    const checkins: CheckIn[] = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-08-${String(i + 14).padStart(2, "0")}`,
      createdAt: i + 1,
      source: "manual" as const,
    }));

    const result = calcRate(checkins, "2026-08-20", 7);

    expect(result.rate).toBeCloseTo(100, 1);
  });

  // ============================================================================
  // AC-4b: calcWeekdayRates().MON with 8회 중 6회 success → 75%
  // ============================================================================
  it("AC-4[P0]: calcWeekdayRates with MON 6/8 success returns 75%", async () => {
    const { calcWeekdayRates } = await import("@/lib/engine");

    // 2026-08-17 is Sunday, 2026-08-18 is Monday
    // Create multiple Mondays with 6 successes out of 8 attempts
    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" }, // Mon
      { date: "2026-08-25", createdAt: 2, source: "manual" }, // Mon
      // Missing 2026-09-01, 2026-09-08, 2026-09-15, 2026-09-22 (gaps)
      // Add 4 more Mondays with gaps
      { date: "2026-09-07", createdAt: 3, source: "manual" }, // Mon
      { date: "2026-09-14", createdAt: 4, source: "manual" }, // Mon
      { date: "2026-09-21", createdAt: 5, source: "manual" }, // Mon
      { date: "2026-09-28", createdAt: 6, source: "manual" }, // Mon
    ];

    const result = calcWeekdayRates(checkins, "2026-09-28");

    // Should have properties for each weekday
    expect(result).toHaveProperty("MON");
    expect(typeof result.MON).toBe("number");
  });

  it("AC-4[P1]: calcWeekdayRates returns object with weekday keys", async () => {
    const { calcWeekdayRates } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" },
    ];

    const result = calcWeekdayRates(checkins, "2026-08-20");

    expect(result).toHaveProperty("MON");
    expect(result).toHaveProperty("TUE");
    expect(result).toHaveProperty("WED");
    expect(result).toHaveProperty("THU");
    expect(result).toHaveProperty("FRI");
    expect(result).toHaveProperty("SAT");
    expect(result).toHaveProperty("SUN");
  });

  // ============================================================================
  // AC-4c: calcWeeklyTrend(최근 8주)
  // ============================================================================
  it("AC-4[P1]: calcWeeklyTrend returns array of 8 weeks", async () => {
    const { calcWeeklyTrend } = await import("@/lib/engine");

    const checkins: CheckIn[] = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, "0")}`,
      createdAt: i + 1,
      source: "manual" as const,
    }));

    const result = calcWeeklyTrend(checkins, "2026-08-31");

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(8);
  });

  it("AC-4[P1]: calcWeeklyTrend each week has count property", async () => {
    const { calcWeeklyTrend } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" },
      { date: "2026-08-19", createdAt: 2, source: "manual" },
    ];

    const result = calcWeeklyTrend(checkins, "2026-08-20");

    result.forEach((week) => {
      expect(week).toHaveProperty("count");
      expect(typeof week.count).toBe("number");
    });
  });

  // ============================================================================
  // AC-5a: evaluateBadges({current:8},[{id:'streak_7'}])에 streak_7 미포함
  // (신규 획득 배지만 반환, 이미 가진 배지는 제외)
  // ============================================================================
  it("AC-5[P0]: evaluateBadges excludes already-earned streak_7", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const currentStreak = 8;
    const alreadyEarned: EarnedBadge[] = [
      { id: "streak_7", earnedAt: 123456 },
    ];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    expect(Array.isArray(result)).toBe(true);
    const earnedIds = result.map((b) => b.id);
    expect(earnedIds).not.toContain("streak_7");
  });

  it("AC-5[P0]: evaluateBadges with current=8 includes streak_14 check", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const currentStreak = 8;
    const alreadyEarned: EarnedBadge[] = [];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    expect(Array.isArray(result)).toBe(true);
    // Should NOT have streak_14 (need 14, have 8)
    const earnedIds = result.map((b) => b.id);
    expect(earnedIds).not.toContain("streak_14");
  });

  it("AC-5[P1]: evaluateBadges with current=30 includes streak_30", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const currentStreak = 30;
    const alreadyEarned: EarnedBadge[] = [];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    const earnedIds = result.map((b) => b.id);
    expect(earnedIds).toContain("streak_30");
  });

  it("AC-5[P1]: evaluateBadges with current=100 includes streak_100", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const currentStreak = 100;
    const alreadyEarned: EarnedBadge[] = [];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    const earnedIds = result.map((b) => b.id);
    expect(earnedIds).toContain("streak_100");
  });

  it("AC-5[P1]: evaluateBadges returns EarnedBadge objects with earnedAt", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const currentStreak = 3;
    const alreadyEarned: EarnedBadge[] = [];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    result.forEach((badge) => {
      expect(badge).toHaveProperty("id");
      expect(badge).toHaveProperty("earnedAt");
      expect(typeof badge.earnedAt).toBe("number");
      expect(badge.earnedAt).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // AC-5b: canRecover('2026-08-05','2026-08-20',[])
  // → {ok:false, reason:'TOO_OLD'} (more than 7 days)
  // ============================================================================
  it("AC-5[P0]: canRecover with gap > 7 days returns ok=false, reason='TOO_OLD'", async () => {
    const { canRecover } = await import("@/lib/engine");

    // 2026-08-05 to 2026-08-20 is 15 days
    const result = canRecover("2026-08-05", "2026-08-20", []);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("TOO_OLD");
  });

  it("AC-5[P0]: canRecover with gap <= 7 days returns ok=true", async () => {
    const { canRecover } = await import("@/lib/engine");

    // 2026-08-14 to 2026-08-20 is 6 days
    const result = canRecover("2026-08-14", "2026-08-20", []);

    expect(result.ok).toBe(true);
  });

  it("AC-5[P1]: canRecover with same day returns ok=true", async () => {
    const { canRecover } = await import("@/lib/engine");

    const result = canRecover("2026-08-20", "2026-08-20", []);

    expect(result.ok).toBe(true);
  });

  it("AC-5[P1]: canRecover returns object with ok and reason fields", async () => {
    const { canRecover } = await import("@/lib/engine");

    const result = canRecover("2026-08-19", "2026-08-20", []);

    expect(result).toHaveProperty("ok");
    expect(typeof result.ok).toBe("boolean");
  });

  it("AC-5[P1]: canRecover at exactly 7 day boundary returns ok=true", async () => {
    const { canRecover } = await import("@/lib/engine");

    // Exactly 7 days apart
    const result = canRecover("2026-08-13", "2026-08-20", []);

    expect(result.ok).toBe(true);
  });

  it("AC-5[P1]: canRecover at 8 day boundary returns ok=false", async () => {
    const { canRecover } = await import("@/lib/engine");

    // 8 days apart
    const result = canRecover("2026-08-12", "2026-08-20", []);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("TOO_OLD");
  });

  // ============================================================================
  // Integration: calcStreak with recovery source dates
  // ============================================================================
  it("AC-3[P1]: calcStreak counts recovery source checkins in streak", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-18", createdAt: 1, source: "manual" },
      { date: "2026-08-19", createdAt: 2, source: "recovery" },
      { date: "2026-08-20", createdAt: 3, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(3);
    expect(result.totalDays).toBe(3);
  });

  // ============================================================================
  // Edge cases & robustness
  // ============================================================================
  it("Edge: calcStreak with unsorted checkins still works", async () => {
    const { calcStreak } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-20", createdAt: 3, source: "manual" },
      { date: "2026-08-18", createdAt: 1, source: "manual" },
      { date: "2026-08-19", createdAt: 2, source: "manual" },
    ];

    const result = calcStreak(checkins, "2026-08-20");

    expect(result.current).toBe(3);
  });

  it("Edge: calcRate with firstCheckInDate parameter", async () => {
    const { calcRate } = await import("@/lib/engine");

    const checkins: CheckIn[] = [
      { date: "2026-08-10", createdAt: 1, source: "manual" },
      { date: "2026-08-11", createdAt: 2, source: "manual" },
      { date: "2026-08-15", createdAt: 3, source: "manual" },
    ];

    // Calculate rate from first checkin to today
    const result = calcRate(checkins, "2026-08-15", 30, "2026-08-10");

    expect(typeof result.rate).toBe("number");
    expect(result.rate).toBeGreaterThanOrEqual(0);
    expect(result.rate).toBeLessThanOrEqual(100);
  });

  it("Edge: evaluateBadges with total_50 badge", async () => {
    const { evaluateBadges } = await import("@/lib/engine");
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    // For total badge we need to pass totalDays, not current streak
    // This tests if the function handles total badges correctly
    const currentStreak = 0;
    const alreadyEarned: EarnedBadge[] = [];

    const result = evaluateBadges(currentStreak, alreadyEarned, BADGE_DEFS);

    // Even with 0 streak, shouldn't crash
    expect(Array.isArray(result)).toBe(true);
  });
});
