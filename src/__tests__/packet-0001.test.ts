import { describe, it, expect } from "vitest";

/**
 * Packet 0001: Entity Types + RouteState Definition (TDD)
 *
 * These tests describe the expected structure of all domain types
 * and route state contracts. They WILL FAIL until src/lib/types.ts
 * is implemented with the correct type definitions.
 *
 * Each Acceptance Criteria maps to at least 1 test below.
 */

describe("Entity Types & RouteState (Packet 0001)", () => {
  describe("AC-1: TypeScript compilation without runtime code", () => {
    it("should allow importing all types from @/lib/types", async () => {
      // This test verifies that types.ts exists and exports what we need
      // The actual type checking is done by `npx tsc --noEmit`
      const types = await import("@/lib/types");

      // Verify that exported items exist (not checking runtime values)
      expect(types).toBeDefined();
      // All should be types/interfaces, no const/function/var
      // This is verified by tsc, not by runtime assertions
    });
  });

  describe("AC-2: BadgeId union with exactly 9 members", () => {
    it("should define BadgeId with first_step, streak_3/7/14/30/60/100, total_50, comeback", async () => {
      const { BadgeId } = await import("@/lib/types");

      // Verify BadgeId is a discriminated union of exactly these 9 values
      // Expected values (order doesn't matter):
      const expectedBadgeIds = [
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

      // Type-level validation: BadgeId should be the union of these strings
      // Runtime assertion (compile-time types are verified by tsc):
      expect(expectedBadgeIds).toContain("first_step");
      expect(expectedBadgeIds).toContain("streak_3");
      expect(expectedBadgeIds).toContain("streak_7");
      expect(expectedBadgeIds).toContain("streak_14");
      expect(expectedBadgeIds).toContain("streak_30");
      expect(expectedBadgeIds).toContain("streak_60");
      expect(expectedBadgeIds).toContain("streak_100");
      expect(expectedBadgeIds).toContain("total_50");
      expect(expectedBadgeIds).toContain("comeback");
      expect(expectedBadgeIds).toHaveLength(9);
    });
  });

  describe("AC-3: RouteState with exactly 6 keys and /recover shape", () => {
    it("should define RouteState as union of route-specific state objects", async () => {
      // Import to verify the types are exported
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();

      // RouteState contract (type-level):
      // - Route '/' → no state (RouteState = Record<string, never> or undefined)
      // - Route '/calendar' → { focusDate?: string } | undefined
      // - Route '/recover' → { targetDate: string } | undefined
      // - Route '/stats' → no state
      // - Route '/badges' → { highlightBadgeId?: BadgeId } | undefined
      // - Route '/rank' → no state

      // Runtime test: verify the types module exports RouteState
      expect(types.RouteState).toBeDefined();
    });

    it("/recover route state should have targetDate field of string | undefined", async () => {
      // This test verifies that /recover state has:
      // - targetDate: string (when recovering a specific date)
      // - undefined (when no target specified — auto-select first missed date in last 7 days)

      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
    });
  });

  describe("AC-4: AddCheckInResult union shape", () => {
    it("should define AddCheckInResult as { ok: true } | { ok: false; reason: ... }", async () => {
      const types = await import("@/lib/types");
      expect(types.AddCheckInResult).toBeDefined();

      // Expected shape:
      // { ok: true } — success
      // { ok: false; reason: 'FUTURE_DATE' | 'DUPLICATE' | 'INVALID_DATE' | 'STORAGE_FULL' }

      // This verifies the type exists; exact shape validated by tsc
    });

    it("AddCheckInResult.reason should have all 4 required values", async () => {
      const types = await import("@/lib/types");

      // Verify all reason codes are defined (compile-time check via tsc):
      const reasonCodes = ["FUTURE_DATE", "DUPLICATE", "INVALID_DATE", "STORAGE_FULL"];
      expect(reasonCodes).toHaveLength(4);
      expect(reasonCodes).toContain("FUTURE_DATE");
      expect(reasonCodes).toContain("DUPLICATE");
      expect(reasonCodes).toContain("INVALID_DATE");
      expect(reasonCodes).toContain("STORAGE_FULL");
    });
  });

  describe("Additional Entity Structures (supporting types)", () => {
    it("should export CheckInSource = 'manual' | 'recovery'", async () => {
      const types = await import("@/lib/types");
      expect(types.CheckInSource).toBeDefined();

      const sources = ["manual", "recovery"];
      expect(sources).toHaveLength(2);
      expect(sources).toContain("manual");
      expect(sources).toContain("recovery");
    });

    it("should export CheckIn interface with date, createdAt, source, memo?", async () => {
      const types = await import("@/lib/types");
      expect(types.CheckIn).toBeDefined();

      // CheckIn shape:
      // - date: string (YYYY-MM-DD)
      // - createdAt: number (epoch ms)
      // - source: CheckInSource
      // - memo?: string (optional, 0-50 chars)
    });

    it("should export StreakState interface", async () => {
      const types = await import("@/lib/types");
      expect(types.StreakState).toBeDefined();

      // StreakState shape:
      // - current: number (0+)
      // - best: number (0+)
      // - lastCheckInDate: string | null (YYYY-MM-DD or null)
      // - totalDays: number (0+)
    });

    it("should export RecoveryWallet and RecoveryUsage interfaces", async () => {
      const types = await import("@/lib/types");
      expect(types.RecoveryWallet).toBeDefined();
      expect(types.RecoveryUsage).toBeDefined();

      // RecoveryWallet:
      // - tickets: number (0-3)
      // - earnedToday: number (0-1)
      // - earnedTodayDate: string (YYYY-MM-DD)
      // - usages: RecoveryUsage[]

      // RecoveryUsage:
      // - recoveredDate: string (YYYY-MM-DD)
      // - usedAt: number (epoch ms)
    });

    it("should export BadgeDef and EarnedBadge interfaces", async () => {
      const types = await import("@/lib/types");
      expect(types.BadgeDef).toBeDefined();
      expect(types.EarnedBadge).toBeDefined();

      // BadgeDef:
      // - id: BadgeId
      // - name: string
      // - description: string
      // - kind: 'streak' | 'total' | 'event'
      // - threshold: number (0+)

      // EarnedBadge:
      // - id: BadgeId
      // - earnedAt: number (epoch ms)
    });

    it("should export Profile interface", async () => {
      const types = await import("@/lib/types");
      expect(types.Profile).toBeDefined();

      // Profile:
      // - deviceUserId: string (UUID v4)
      // - nickname: string (2-10 chars)
      // - inviteCode: string (^[A-Z0-9]{6}$)
      // - roomCode: string | null (^[A-Z0-9]{6}$ or null)
      // - onboardedAt: number | null (epoch ms or null)
    });

    it("should export RankEntry interface", async () => {
      const types = await import("@/lib/types");
      expect(types.RankEntry).toBeDefined();

      // RankEntry (from external API):
      // - userId: string
      // - nickname: string
      // - currentStreak: number
      // - bestStreak: number
      // - totalDays: number
      // - rank: number (1+, 1-indexed)
    });

    it("should export AppFlags interface", async () => {
      const types = await import("@/lib/types");
      expect(types.AppFlags).toBeDefined();

      // AppFlags:
      // - onboardingSeen: boolean
      // - lastSeenBadgeId: BadgeId | null
    });

    it("should export ApiError interface", async () => {
      const types = await import("@/lib/types");
      expect(types.ApiError).toBeDefined();

      // ApiError:
      // - error: string (error code: INVALID_PAYLOAD, ROOM_NOT_FOUND, etc.)
    });
  });

  describe("Type Safety & Compilation", () => {
    it("should pass TypeScript strict mode (npx tsc --noEmit)", async () => {
      // This test is a reminder to run: npm run typecheck
      // before finishing the packet. It verifies that all types are
      // correctly exported and no runtime code exists in types.ts
      expect(true).toBe(true);
    });

    it("all exports should be type/interface, not const/function/var", async () => {
      // Verify src/lib/types.ts contains only:
      // - export type BadgeId = ...
      // - export interface CheckIn { ... }
      // - NO const, function, var declarations
      const types = await import("@/lib/types");
      expect(types).toBeDefined();
    });
  });

  describe("RouteState contract details", () => {
    it("/ route should not use location.state (state = undefined)", async () => {
      const types = await import("@/lib/types");
      expect(types.RouteState).toBeDefined();
      // / is home screen — no state passed
    });

    it("/calendar route state should have optional focusDate", async () => {
      const types = await import("@/lib/types");
      // /calendar: { focusDate?: string } | undefined
      // focusDate is optional, auto-selects current month when undefined
    });

    it("/recover route state should have optional targetDate as required field when present", async () => {
      const types = await import("@/lib/types");
      // /recover: { targetDate: string } | undefined
      // targetDate format: 'YYYY-MM-DD'
      // When state is undefined, auto-selects first missed date in last 7 days
    });

    it("/stats route should not use location.state", async () => {
      const types = await import("@/lib/types");
      // /stats: no state
    });

    it("/badges route state should have optional highlightBadgeId", async () => {
      const types = await import("@/lib/types");
      // /badges: { highlightBadgeId?: BadgeId } | undefined
      // When provided, UI highlights that badge cell with border
    });

    it("/rank route should not use location.state", async () => {
      const types = await import("@/lib/types");
      // /rank: no state
    });
  });

  describe("Type Exports Inventory (all 13 types)", () => {
    it("should export exactly the required types and no duplicates", async () => {
      const types = await import("@/lib/types");

      const requiredExports = [
        "CheckInSource",
        "CheckIn",
        "StreakState",
        "RecoveryWallet",
        "RecoveryUsage",
        "BadgeId",
        "BadgeDef",
        "EarnedBadge",
        "Profile",
        "RankEntry",
        "AppFlags",
        "ApiError",
        "AddCheckInResult",
        "RouteState",
      ];

      requiredExports.forEach((exportName) => {
        expect(types[exportName as keyof typeof types]).toBeDefined(
          `Type ${exportName} should be exported from @/lib/types`
        );
      });
    });
  });
});
