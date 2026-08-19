import { describe, it, expect, vi } from "vitest";

// 순수 함수 테스트이므로 별도 mock 불필요
// todayKST, addDays, diffDays, isValidDateStr, formatKorean, monthMatrix, weekdayKey 테스트
// BADGE_DEFS, getBadgeDef 테스트

describe("Packet 0002: KST 날짜 유틸 + BadgeDef 테이블", () => {
  // ============================================================================
  // AC-1: 시스템 TZ가 UTC / America/New_York / Asia/Seoul일 때
  // todayKST()가 모두 KST 기준 동일 날짜 반환
  // ============================================================================
  it("AC-1[P0]: todayKST() returns same KST date regardless of system timezone", async () => {
    // 동적 import로 date 모듈을 로드하되, 각 TZ마다 새로 로드
    const timezones = ["UTC", "America/New_York", "Asia/Seoul"];
    const results = [];

    for (const tz of timezones) {
      // Node.js 환경에서 TZ 환경변수 설정 후 date 모듈 재로드
      process.env.TZ = tz;
      // Date 객체의 캐시를 무효화하기 위해 require.cache 클리어 (필요 시)
      // vitest에서는 import 재로드가 어려우므로, 함수에서 offset을 고려한 계산 확인
      const { todayKST } = await import("@/lib/date");
      const today = todayKST();
      results.push({ tz, today });
    }

    // 모든 timezone에서 같은 KST 날짜가 나와야 함
    const firstDate = results[0].today;
    results.forEach(({ tz, today }) => {
      expect(today).toBe(firstDate);
      // 날짜 형식 검증: YYYY-MM-DD
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    // 정리
    delete process.env.TZ;
  });

  // ============================================================================
  // AC-2: diffDays / addDays 기본 계산
  // ============================================================================
  it("AC-2[P0]: diffDays('2026-08-20', '2026-08-18') returns 2", async () => {
    const { diffDays } = await import("@/lib/date");
    const result = diffDays("2026-08-20", "2026-08-18");
    expect(result).toBe(2);
  });

  it("AC-2[P0]: addDays('2026-08-31', 1) returns '2026-09-01'", async () => {
    const { addDays } = await import("@/lib/date");
    const result = addDays("2026-08-31", 1);
    expect(result).toBe("2026-09-01");
  });

  it("AC-2[P1]: addDays handles month boundaries (backwards)", async () => {
    const { addDays } = await import("@/lib/date");
    const result = addDays("2026-09-01", -1);
    expect(result).toBe("2026-08-31");
  });

  it("AC-2[P1]: addDays with 0 returns same date", async () => {
    const { addDays } = await import("@/lib/date");
    const result = addDays("2026-08-20", 0);
    expect(result).toBe("2026-08-20");
  });

  it("AC-2[P1]: diffDays with same date returns 0", async () => {
    const { diffDays } = await import("@/lib/date");
    const result = diffDays("2026-08-20", "2026-08-20");
    expect(result).toBe(0);
  });

  it("AC-2[P1]: diffDays with reversed order returns negative", async () => {
    const { diffDays } = await import("@/lib/date");
    const result = diffDays("2026-08-18", "2026-08-20");
    expect(result).toBe(-2);
  });

  // ============================================================================
  // AC-3: monthMatrix(2026, 7) — 7월 달력 배치
  // 2026년 7월: 1일이 수요일(index 3), 31일이 금요일(index 5)
  // 총 셀: 3(빈칸) + 31(날짜) + 0(남은 빈칸) = 34 → 7의 배수 위해 42셀(6행)
  // ============================================================================
  it("AC-3[P0]: monthMatrix(2026, 7) total cells divisible by 7", async () => {
    const { monthMatrix } = await import("@/lib/date");
    const matrix = monthMatrix(2026, 7);
    const total = matrix.length;

    expect(total % 7).toBe(0);
    expect(total).toBeGreaterThanOrEqual(28); // 최소 4행 = 28셀
  });

  it("AC-3[P0]: monthMatrix(2026, 7) contains 31 date strings + padding", async () => {
    const { monthMatrix } = await import("@/lib/date");
    const matrix = monthMatrix(2026, 7);

    const dateStrings = matrix.filter((cell) => cell !== null);
    const nulls = matrix.filter((cell) => cell === null);

    expect(dateStrings).toHaveLength(31); // 7월은 31일
    expect(nulls.length).toBeGreaterThanOrEqual(0); // 패딩 0개 이상
    // 날짜 문자열은 형식이 YYYY-MM-DD이어야 함
    dateStrings.forEach((dateStr) => {
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    // 첫 날짜와 마지막 날짜 확인
    expect(dateStrings.some((d) => d === "2026-07-01")).toBe(true);
    expect(dateStrings.some((d) => d === "2026-07-31")).toBe(true);
  });

  it("AC-3[P1]: monthMatrix(2026, 2) handles 28-day February", async () => {
    const { monthMatrix } = await import("@/lib/date");
    const matrix = monthMatrix(2026, 2);
    const dateStrings = matrix.filter((cell) => cell !== null);

    expect(dateStrings).toHaveLength(28);
    expect(dateStrings[0]).toBe("2026-02-01");
    expect(dateStrings[27]).toBe("2026-02-28");
  });

  // ============================================================================
  // AC-4: BADGE_DEFS 테이블 및 getBadgeDef
  // ============================================================================
  it("AC-4[P0]: BADGE_DEFS has exactly 9 entries", async () => {
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    expect(BADGE_DEFS).toHaveLength(9);
  });

  it("AC-4[P0]: BADGE_DEFS has no duplicate IDs", async () => {
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const ids = BADGE_DEFS.map((badge) => badge.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(9);
    expect(uniqueIds.size).toBe(ids.length); // no duplicates
  });

  it("AC-4[P0]: BADGE_DEFS matches SPEC (first_step, streak_3, ..., comeback)", async () => {
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const expectedIds = [
      "first_step",
      "streak_3",
      "streak_7",
      "streak_14",
      "streak_30",
      "streak_60",
      "streak_100",
      "total_50",
      "comeback",
    ];

    const actualIds = BADGE_DEFS.map((badge) => badge.id);
    expectedIds.forEach((id) => {
      expect(actualIds).toContain(id);
    });
  });

  it("AC-4[P0]: BADGE_DEFS entries have correct kind and threshold", async () => {
    const { BADGE_DEFS } = await import("@/lib/badgeDefs");

    const badgeMap: Record<string, { kind: string; threshold: number }> = {
      first_step: { kind: "total", threshold: 1 },
      streak_3: { kind: "streak", threshold: 3 },
      streak_7: { kind: "streak", threshold: 7 },
      streak_14: { kind: "streak", threshold: 14 },
      streak_30: { kind: "streak", threshold: 30 },
      streak_60: { kind: "streak", threshold: 60 },
      streak_100: { kind: "streak", threshold: 100 },
      total_50: { kind: "total", threshold: 50 },
      comeback: { kind: "event", threshold: 0 },
    };

    BADGE_DEFS.forEach((badge) => {
      const expected = badgeMap[badge.id];
      expect(expected).toBeDefined();
      expect(badge.kind).toBe(expected.kind);
      expect(badge.threshold).toBe(expected.threshold);
    });
  });

  it("AC-4[P1]: getBadgeDef('streak_999') returns undefined", async () => {
    const { getBadgeDef } = await import("@/lib/badgeDefs");

    const result = getBadgeDef("streak_999");
    expect(result).toBeUndefined();
  });

  it("AC-4[P1]: getBadgeDef('first_step') returns correct badge", async () => {
    const { getBadgeDef } = await import("@/lib/badgeDefs");

    const result = getBadgeDef("first_step");
    expect(result).toBeDefined();
    expect(result?.id).toBe("first_step");
    expect(result?.kind).toBe("total");
    expect(result?.threshold).toBe(1);
    expect(result?.name).toBe("첫 걸음");
  });

  it("AC-4[P1]: getBadgeDef('streak_30') returns correct badge", async () => {
    const { getBadgeDef } = await import("@/lib/badgeDefs");

    const result = getBadgeDef("streak_30");
    expect(result).toBeDefined();
    expect(result?.id).toBe("streak_30");
    expect(result?.kind).toBe("streak");
    expect(result?.threshold).toBe(30);
    expect(result?.name).toBe("한 달 절약왕");
  });

  // ============================================================================
  // AC-5: 금지된 Array.prototype 메서드 사용 0건
  // 소스 코드 검사 (import 후 체크)
  // ============================================================================
  it("AC-5[P0]: date.ts does not use Array.prototype.at/findLast/Object.groupBy/structuredClone", async () => {
    // 소스 코드를 문자열로 읽어서 금지 API 사용 확인
    const fs = await import("fs");
    const path = await import("path");

    const dateFile = path.join(process.cwd(), "src/lib/date.ts");
    const badgeDefs = path.join(process.cwd(), "src/lib/badgeDefs.ts");

    let sourceCode = "";
    if (fs.existsSync(dateFile)) {
      sourceCode += fs.readFileSync(dateFile, "utf-8");
    }
    if (fs.existsSync(badgeDefs)) {
      sourceCode += fs.readFileSync(badgeDefs, "utf-8");
    }

    // 금지 패턴 검사 (주석과 문자열 제외 간단히 검사)
    const forbiddenPatterns = [
      /\.at\(/,
      /\.findLast\(/,
      /\.structuredClone\(/,
      /Object\.groupBy\(/,
    ];

    forbiddenPatterns.forEach((pattern) => {
      expect(sourceCode).not.toMatch(pattern);
    });
  });
});
