# Packet 0003: localStorage 영속 레이어 — TDD Red Phase Complete ✅

## Test File Summary
- **Location:** `src/__tests__/packet-0003.test.ts`
- **Test Count:** 30 total (all failing in TDD red phase, as expected)
- **Status:** Ready for Coder implementation

## Test Breakdown by AC

### AC-1: JSON Corruption Recovery (5 tests)
Tests verify that corrupted localStorage JSON is automatically recovered:
- readCheckIns() with '{{{broken' → returns [] and fixes key to '[]'
- readStreak() with invalid JSON → returns default StreakState
- readRecovery/readBadges() handle corruption gracefully

### AC-2: Error Handling / QuotaExceededError (5 tests)
Tests verify write functions return false on errors without throwing:
- writeCheckIns() on QuotaExceededError → false (no throw)
- writeStreak() on quota error → false
- writeRecovery/writeBadges() catch all errors silently

### AC-3: ensureProfile() Generation (4 tests)
Tests verify UUID v4 + inviteCode idempotence:
- Multiple calls return same deviceUserId
- inviteCode matches /^[A-Z0-9]{6}$/
- UUID v4 format validation (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)

### AC-4: LS_KEYS Constant (1 test)
- Validates all 7 keys exist with correct values

### AC-5: Entity CRUD Roundtrips (7 tests)
- CheckIns: write→read consistency
- Streak: write→read consistency
- Recovery: write→read consistency
- Badges: write→read consistency
- RankCache: write→read consistency
- Flags: write→read consistency
- Profile: write→read consistency

### AC-6: Default Values (6 tests)
- readCheckIns() returns [] when key missing
- readStreak() returns { current:0, best:0, lastCheckInDate:null, totalDays:0 }
- readRecovery/readBadges/readRankCache/readFlags all return sensible defaults

### AC-7: Console Error Guard (1 test)
- Runs all read/write ops, verifies console.error.callCount === 0

### AC-8-10: Edge Cases (3 tests)
- readProfile() idempotence with ensureProfile()
- Multiple entity consistency
- inviteCode uniqueness across calls

## Required Exports from storage.ts

```typescript
// Constant
export const LS_KEYS = {
  checkins: 'zss.v1.checkins',
  streak: 'zss.v1.streak',
  recovery: 'zss.v1.recovery',
  badges: 'zss.v1.badges',
  profile: 'zss.v1.profile',
  rankCache: 'zss.v1.rankCache',
  flags: 'zss.v1.flags',
};

// Read functions (handle corruption, return defaults)
export function readCheckIns(): CheckIn[];
export function readStreak(): StreakState;
export function readRecovery(): RecoveryWallet;
export function readBadges(): EarnedBadge[];
export function readRankCache(): RankEntry[];
export function readFlags(): AppFlags;
export function readProfile(): Profile;

// Write functions (return boolean, catch all errors)
export function writeCheckIns(data: CheckIn[]): boolean;
export function writeStreak(data: StreakState): boolean;
export function writeRecovery(data: RecoveryWallet): boolean;
export function writeBadges(data: EarnedBadge[]): boolean;
export function writeRankCache(data: RankEntry[]): boolean;
export function writeFlags(data: AppFlags): boolean;
export function writeProfile(data: Profile): boolean;

// Generator
export function ensureProfile(): Profile;
```

## Key Implementation Patterns

### JSON Corruption Recovery
```typescript
function readX<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    // Fix corrupted key
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
}
```

### Error-Safe Write
```typescript
function writeX<T>(key: string, data: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    // Silent catch — no console.error, no throw
    return false;
  }
}
```

### ensureProfile() Idempotence
```typescript
export function ensureProfile(): Profile {
  // Read existing profile
  const key = LS_KEYS.profile;
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      // Corrupted — regenerate
    }
  }
  
  // Create new profile with UUID v4 + 6-char alphanumeric code
  const profile: Profile = {
    deviceUserId: crypto.randomUUID(),  // UUID v4
    inviteCode: generateInviteCode(),    // /^[A-Z0-9]{6}$/
    nickname: 'User',                    // Default
    roomCode: null,
    onboardedAt: null,
  };
  
  localStorage.setItem(key, JSON.stringify(profile));
  return profile;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

## Test Quality Validation ✅

- [x] All 30 tests failing (TDD red phase)
- [x] Every AC has ≥1 test (P0 ACs have ≥2 tests)
- [x] Concrete assertions (exact values, not toBeTruthy)
- [x] Clear descriptive names matching ACs with P0/P1 priority
- [x] Error cases covered (corruption, quota exceeded, missing keys)
- [x] Happy path covered (successful CRUD roundtrips)
- [x] Edge cases covered (idempotence, UUID format, inviteCode regex)
- [x] Uses dynamic import for proper module isolation
- [x] Mocks Storage.prototype.setItem for error injection
- [x] Verifies console.error callCount === 0
- [x] Tests verify both mutation (key rewrite) and return values
- [x] No false assertions (all expect() statements are meaningful)

## Example Test Assertions

### Corruption Recovery Verification
```typescript
// BEFORE: localStorage['zss.v1.checkins'] = '{{{broken'
const result = readCheckIns();
expect(result).toEqual([]);                                    // Returns default
expect(localStorage.getItem('zss.v1.checkins')).toBe('[]');   // Key is fixed
```

### Error Handling Verification
```typescript
// When Storage.setItem throws DOMException("QuotaExceededError")
const result = writeCheckIns([...]);
expect(result).toBe(false);  // Returns false, doesn't throw
```

### ensureProfile Verification
```typescript
const profile1 = ensureProfile();
const profile2 = ensureProfile();
expect(profile2.deviceUserId).toBe(profile1.deviceUserId);     // Same UUID
expect(profile1.inviteCode).toMatch(/^[A-Z0-9]{6}$/);         // Valid format
expect(profile1.inviteCode).toBe(profile2.inviteCode);         // Consistent
```

## Next: Green Phase (Coder Implementation)
1. Coder reads all 30 tests in `src/__tests__/packet-0003.test.ts`
2. Implements functions in `src/lib/storage.ts` to make all tests pass
3. All tests should pass without modification
4. No changes to test file needed

---

**Test Date:** 2026-08-20  
**Status:** ✅ TDD Red Phase Complete — Ready for Implementation
