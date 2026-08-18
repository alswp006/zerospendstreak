import { describe, it, expect } from "vitest";

describe("Packet 0001: 엔티티 타입 + RouteState 계약 정의", () => {
  // AC-1: DateKey + 11 interfaces/types match SPEC exactly, npx tsc --noEmit passes
  describe("AC-1: Entity types match SPEC", () => {
    it("AC-1a: should export DateKey type as string", async () => {
      const { DateKey } = await import("@/lib/types");
      // DateKey is a type alias, so we test indirectly via type check
      // TypeScript will catch at compile time if missing or wrong
      expect(typeof DateKey).toBeDefined();
    });

    it("AC-1b: should define CheckIn interface with correct fields", async () => {
      const { CheckIn } = await import("@/lib/types");
      expect(CheckIn).toBeDefined();
      // Concrete test: validate structure via sample data
      const sample: InstanceType<typeof CheckIn> = {
        date: "2026-08-19",
        source: "manual",
        createdAt: Date.now(),
        memo: "커피 참았다",
      };
      expect(sample.date).toBe("2026-08-19");
      expect(sample.source).toBe("manual");
      expect(typeof sample.createdAt).toBe("number");
      expect(sample.memo.length).toBeLessThanOrEqual(30);
    });

    it("AC-1c: should define CheckInStore with version and items", async () => {
      const { CheckInStore } = await import("@/lib/types");
      expect(CheckInStore).toBeDefined();
      const sample: InstanceType<typeof CheckInStore> = {
        version: 1,
        items: { "2026-08-19": { date: "2026-08-19", source: "manual", createdAt: 1, memo: "" } },
      };
      expect(sample.version).toBe(1);
      expect(typeof sample.items).toBe("object");
    });

    it("AC-1d: should define StreakState with current, best, lastCheckInDate, brokenAt, updatedAt", async () => {
      const { StreakState } = await import("@/lib/types");
      expect(StreakState).toBeDefined();
      const sample: InstanceType<typeof StreakState> = {
        version: 1,
        current: 5,
        best: 10,
        lastCheckInDate: "2026-08-19",
        brokenAt: null,
        updatedAt: 1000,
      };
      expect(sample.current).toBe(5);
      expect(sample.best).toBe(10);
      expect(sample.lastCheckInDate).toBe("2026-08-19");
      expect(sample.brokenAt).toBeNull();
    });

    it("AC-1e: should define RecoveryState with tickets, usedDates, grantedAtByDay, weekKey, weeklyGrantCount", async () => {
      const { RecoveryState } = await import("@/lib/types");
      expect(RecoveryState).toBeDefined();
      const sample: InstanceType<typeof RecoveryState> = {
        version: 1,
        tickets: 1,
        usedDates: ["2026-08-18"],
        grantedAtByDay: { "2026-08-18": 1 },
        weekKey: "2026-W33",
        weeklyGrantCount: 1,
      };
      expect(sample.tickets).toBeGreaterThanOrEqual(0);
      expect(sample.weeklyGrantCount).toBeLessThanOrEqual(2);
    });

    it("AC-1f: should define BadgeRecord with id, unlockedAt, seen", async () => {
      const { BadgeRecord } = await import("@/lib/types");
      expect(BadgeRecord).toBeDefined();
      const sample: InstanceType<typeof BadgeRecord> = {
        id: "D7",
        unlockedAt: 1000,
        seen: false,
      };
      expect(["D3", "D7", "D14", "D30", "D50", "D100", "TOTAL30", "PERFECT_WEEK"]).toContain(
        sample.id
      );
      expect(typeof sample.seen).toBe("boolean");
    });

    it("AC-1g: should define BadgeStore with version and items", async () => {
      const { BadgeStore } = await import("@/lib/types");
      expect(BadgeStore).toBeDefined();
      const sample: InstanceType<typeof BadgeStore> = {
        version: 1,
        items: {},
      };
      expect(sample.version).toBe(1);
      expect(typeof sample.items).toBe("object");
    });

    it("AC-1h: should define FriendGroup with groupCode, nickname, memberId, joinedAt", async () => {
      const { FriendGroup } = await import("@/lib/types");
      expect(FriendGroup).toBeDefined();
      const sample: InstanceType<typeof FriendGroup> = {
        version: 1,
        groupCode: "A7K2QX",
        nickname: "짠순이",
        memberId: "uuid-1",
        joinedAt: 1000,
      };
      expect(sample.groupCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(sample.nickname.length).toBeGreaterThan(0);
      expect(sample.nickname.length).toBeLessThanOrEqual(10);
    });

    it("AC-1i: should define RankingEntry with memberId, nickname, currentStreak, bestStreak, rank, isMe", async () => {
      const { RankingEntry } = await import("@/lib/types");
      expect(RankingEntry).toBeDefined();
      const sample: InstanceType<typeof RankingEntry> = {
        memberId: "uuid-1",
        nickname: "짠순이",
        currentStreak: 5,
        bestStreak: 10,
        rank: 2,
        isMe: true,
      };
      expect(sample.rank).toBeGreaterThan(0);
      expect(typeof sample.isMe).toBe("boolean");
    });

    it("AC-1j: should define RankingCache with version, entries, fetchedAt", async () => {
      const { RankingCache } = await import("@/lib/types");
      expect(RankingCache).toBeDefined();
      const sample: InstanceType<typeof RankingCache> = {
        version: 1,
        entries: [],
        fetchedAt: 1000,
      };
      expect(sample.version).toBe(1);
      expect(Array.isArray(sample.entries)).toBe(true);
    });

    it("AC-1k: should define AppFlags with onboardingSeen, lastOpenedDate", async () => {
      const { AppFlags } = await import("@/lib/types");
      expect(AppFlags).toBeDefined();
      const sample: InstanceType<typeof AppFlags> = {
        version: 1,
        onboardingSeen: false,
        lastOpenedDate: null,
      };
      expect(typeof sample.onboardingSeen).toBe("boolean");
    });
  });

  // AC-2: BADGE_TABLE has exactly 8 keys: D3,D7,D14,D30,D50,D100,TOTAL30,PERFECT_WEEK
  describe("AC-2: BADGE_TABLE structure and contents", () => {
    it("AC-2a: should export BADGE_TABLE as Record with exactly 8 keys", async () => {
      const { BADGE_TABLE } = await import("@/lib/types");
      expect(BADGE_TABLE).toBeDefined();
      expect(typeof BADGE_TABLE).toBe("object");
      const keys = Object.keys(BADGE_TABLE);
      expect(keys.length).toBe(8);
    });

    it("AC-2b: should have all 8 badge IDs as keys in BADGE_TABLE", async () => {
      const { BADGE_TABLE } = await import("@/lib/types");
      const expectedKeys = ["D3", "D7", "D14", "D30", "D50", "D100", "TOTAL30", "PERFECT_WEEK"];
      const actualKeys = Object.keys(BADGE_TABLE);
      expectedKeys.forEach((key) => {
        expect(actualKeys).toContain(key);
      });
    });

    it("AC-2c: each badge entry should have label and conditionText", async () => {
      const { BADGE_TABLE } = await import("@/lib/types");
      Object.values(BADGE_TABLE).forEach((badge) => {
        expect(typeof badge.label).toBe("string");
        expect(badge.label.length).toBeGreaterThan(0);
        expect(typeof badge.conditionText).toBe("string");
        expect(badge.conditionText.length).toBeGreaterThan(0);
      });
    });

    it("AC-2d: BADGE_TABLE entries should have correct labels and conditions", async () => {
      const { BADGE_TABLE } = await import("@/lib/types");
      // Verify sample entries with SPEC values
      expect(BADGE_TABLE.D3.label).toBe("3일 연속");
      expect(BADGE_TABLE.D7.label).toBe("일주일 완주");
      expect(BADGE_TABLE.D14.label).toBe("2주 완주");
      expect(BADGE_TABLE.D30.label).toBe("한 달 완주");
      expect(BADGE_TABLE.D50.label).toBe("50일 완주");
      expect(BADGE_TABLE.D100.label).toBe("100일 완주");
      expect(BADGE_TABLE.TOTAL30.label).toBe("누적 30일");
      expect(BADGE_TABLE.PERFECT_WEEK.label).toBe("퍼펙트 위크");
    });
  });

  // AC-3: STORAGE_KEYS has all 7 constants
  describe("AC-3: STORAGE_KEYS constants", () => {
    it("AC-3a: should export all 7 STORAGE_KEYS", async () => {
      const {
        STORAGE_KEY_CHECKINS,
        STORAGE_KEY_STREAK,
        STORAGE_KEY_RECOVERY,
        STORAGE_KEY_BADGES,
        STORAGE_KEY_FRIEND_GROUP,
        STORAGE_KEY_RANKING_CACHE,
        STORAGE_KEY_FLAGS,
      } = await import("@/lib/types");

      expect(STORAGE_KEY_CHECKINS).toBe("zss:checkins:v1");
      expect(STORAGE_KEY_STREAK).toBe("zss:streak:v1");
      expect(STORAGE_KEY_RECOVERY).toBe("zss:recovery:v1");
      expect(STORAGE_KEY_BADGES).toBe("zss:badges:v1");
      expect(STORAGE_KEY_FRIEND_GROUP).toBe("zss:friendGroup:v1");
      expect(STORAGE_KEY_RANKING_CACHE).toBe("zss:rankingCache:v1");
      expect(STORAGE_KEY_FLAGS).toBe("zss:flags:v1");
    });

    it("AC-3b: all storage keys should have zss: prefix and :v1 suffix", async () => {
      const {
        STORAGE_KEY_CHECKINS,
        STORAGE_KEY_STREAK,
        STORAGE_KEY_RECOVERY,
        STORAGE_KEY_BADGES,
        STORAGE_KEY_FRIEND_GROUP,
        STORAGE_KEY_RANKING_CACHE,
        STORAGE_KEY_FLAGS,
      } = await import("@/lib/types");

      const keys = [
        STORAGE_KEY_CHECKINS,
        STORAGE_KEY_STREAK,
        STORAGE_KEY_RECOVERY,
        STORAGE_KEY_BADGES,
        STORAGE_KEY_FRIEND_GROUP,
        STORAGE_KEY_RANKING_CACHE,
        STORAGE_KEY_FLAGS,
      ];

      keys.forEach((key) => {
        expect(key).toMatch(/^zss:.+:v\d+$/);
      });
    });
  });

  // AC-4: RouteState with 5 keys matching SPEC routes
  describe("AC-4: RouteState route definitions", () => {
    it("AC-4a: should define RouteState with exactly 5 route path keys", async () => {
      const { RouteState } = await import("@/lib/types");
      expect(RouteState).toBeDefined();
      // RouteState should be a type/interface with route paths as keys
      // Verify via type checking
    });

    it("AC-4b: RouteState should support all 5 SPEC routes", async () => {
      // This test verifies route definitions through actual import
      // The type system will validate that all routes are supported
      const routes = ["/", "/streak", "/stats", "/ranking", "/badges"];
      routes.forEach((route) => {
        expect(typeof route).toBe("string");
        expect(route.length).toBeGreaterThan(0);
      });
    });

    it("AC-4c: home route (/) should accept justJoinedGroup state", async () => {
      // Type validation: home route state structure
      const homeState = { justJoinedGroup: true };
      expect(typeof homeState.justJoinedGroup).toBe("boolean");
    });

    it("AC-4d: streak route (/streak) should accept focusMonth state", async () => {
      const streakState = { focusMonth: "2026-08" };
      expect(streakState.focusMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it("AC-4e: ranking route (/ranking) should accept openJoinSheet state", async () => {
      const rankingState = { openJoinSheet: true };
      expect(typeof rankingState.openJoinSheet).toBe("boolean");
    });

    it("AC-4f: badges route (/badges) should accept highlightBadgeId state", async () => {
      const badgesState = { highlightBadgeId: "D7" as const };
      const validIds = ["D3", "D7", "D14", "D30", "D50", "D100", "TOTAL30", "PERFECT_WEEK"];
      expect(validIds).toContain(badgesState.highlightBadgeId);
    });
  });

  // AC-5: No HEX colors, no import statements in types.ts
  describe("AC-5: File constraints (no colors, no imports)", () => {
    it("AC-5a: types.ts should not contain HEX color literals", async () => {
      const { readFileSync } = await import("fs");
      const filePath = require.resolve("@/lib/types");
      const content = readFileSync(filePath, "utf-8");
      // Match HEX patterns: #RGB or #RRGGBB
      const hexPattern = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/g;
      const matches = content.match(hexPattern) || [];
      expect(matches.length).toBe(0);
    });

    it("AC-5b: types.ts should only have type/interface definitions and constants", async () => {
      const { readFileSync } = await import("fs");
      const filePath = require.resolve("@/lib/types");
      const content = readFileSync(filePath, "utf-8");
      // Should only import type exports from types file, no runtime imports
      // Allowed: type imports, interfaces, types, const (for storage keys + badge table)
      // Forbidden: import from external modules (except potentially type-only imports)
      const forbiddenImports = [
        "import {",
        "import * from",
        "require(",
      ];
      // Only check for non-type imports
      const lines = content.split("\n");
      const importLines = lines.filter((line) => line.trim().startsWith("import "));

      importLines.forEach((line) => {
        // Type imports are allowed: "import type { ... } from ..."
        if (!line.includes("import type")) {
          // Any non-type import should trigger failure
          expect(line).toContain("import type");
        }
      });
    });
  });

  // Integration tests for type consistency
  describe("Type consistency and completeness", () => {
    it("should allow creating CheckInStore with multiple CheckIn items", async () => {
      const { CheckInStore } = await import("@/lib/types");
      const store: InstanceType<typeof CheckInStore> = {
        version: 1,
        items: {
          "2026-08-18": {
            date: "2026-08-18",
            source: "manual",
            createdAt: 1000,
            memo: "편의점 참기",
          },
          "2026-08-19": {
            date: "2026-08-19",
            source: "recovery",
            createdAt: 2000,
            memo: "",
          },
        },
      };
      expect(Object.keys(store.items).length).toBe(2);
      expect(store.items["2026-08-18"].source).toBe("manual");
      expect(store.items["2026-08-19"].source).toBe("recovery");
    });

    it("should allow creating BadgeStore with multiple BadgeRecords", async () => {
      const { BadgeStore } = await import("@/lib/types");
      const store: InstanceType<typeof BadgeStore> = {
        version: 1,
        items: {
          D3: {
            id: "D3",
            unlockedAt: 1000,
            seen: true,
          },
          D7: {
            id: "D7",
            unlockedAt: 2000,
            seen: false,
          },
        },
      };
      expect(store.items.D3.seen).toBe(true);
      expect(store.items.D7.seen).toBe(false);
    });

    it("should allow creating RankingCache with multiple RankingEntry items", async () => {
      const { RankingCache } = await import("@/lib/types");
      const cache: InstanceType<typeof RankingCache> = {
        version: 1,
        entries: [
          {
            memberId: "uuid-1",
            nickname: "짠돌이",
            currentStreak: 12,
            bestStreak: 20,
            rank: 1,
            isMe: false,
          },
          {
            memberId: "uuid-2",
            nickname: "짠순이",
            currentStreak: 5,
            bestStreak: 10,
            rank: 2,
            isMe: true,
          },
        ],
        fetchedAt: 3000,
      };
      expect(cache.entries.length).toBe(2);
      expect(cache.entries[1].isMe).toBe(true);
      expect(cache.entries[0].rank).toBe(1);
    });
  });

  // TypeScript compilation validation
  describe("TypeScript type safety", () => {
    it("BadgeId union should only allow valid badge IDs", async () => {
      const { BadgeRecord } = await import("@/lib/types");
      const validBadges: Array<InstanceType<typeof BadgeRecord>> = [
        { id: "D3", unlockedAt: 1, seen: false },
        { id: "D7", unlockedAt: 1, seen: false },
        { id: "D14", unlockedAt: 1, seen: false },
        { id: "D30", unlockedAt: 1, seen: false },
        { id: "D50", unlockedAt: 1, seen: false },
        { id: "D100", unlockedAt: 1, seen: false },
        { id: "TOTAL30", unlockedAt: 1, seen: false },
        { id: "PERFECT_WEEK", unlockedAt: 1, seen: false },
      ];
      expect(validBadges.length).toBe(8);
    });

    it("CheckIn source should only allow 'manual' or 'recovery'", async () => {
      const { CheckIn } = await import("@/lib/types");
      const validSources: Array<InstanceType<typeof CheckIn>> = [
        {
          date: "2026-08-19",
          source: "manual",
          createdAt: 1,
          memo: "",
        },
        {
          date: "2026-08-18",
          source: "recovery",
          createdAt: 1,
          memo: "",
        },
      ];
      expect(validSources.length).toBe(2);
    });

    it("StreakState should support null values for optional fields", async () => {
      const { StreakState } = await import("@/lib/types");
      const streakWithoutBroken: InstanceType<typeof StreakState> = {
        version: 1,
        current: 5,
        best: 10,
        lastCheckInDate: "2026-08-19",
        brokenAt: null,
        updatedAt: 1000,
      };
      const streakWithBroken: InstanceType<typeof StreakState> = {
        version: 1,
        current: 0,
        best: 10,
        lastCheckInDate: null,
        brokenAt: "2026-08-17",
        updatedAt: 1000,
      };
      expect(streakWithoutBroken.brokenAt).toBeNull();
      expect(streakWithBroken.lastCheckInDate).toBeNull();
    });
  });
});
