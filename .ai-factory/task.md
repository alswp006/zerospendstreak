# TASK — ZeroSpendStreak

> Cross-validation 반영 개정판 (v2)

---

## 0. 문서 정합성 노트 (PRD ↔ SPEC ↔ TASK)

리뷰에서 제기된 "F8이 PRD에 없다"는 **번호 체계 불일치**이며, 기능 누락이 아니다. 확정 매핑:

| PRD 기능 (6개, 사용자 관점) | SPEC Feature (8개, 구현 단위) | 비고 |
|---|---|---|
| 1. 무지출 체크인 | **F1** 스트릭 계산 엔진 + **F2** 홈 체크인 UI | PRD 1개 → SPEC 2개(엔진/UI 분리) |
| 2. 스트릭 시각화 | **F3** 캘린더 기록 | — |
| 3. 스트릭 복구(광고) | **F4** 복구권 & 리워드 광고 | PRD "5. Recovery ads"와 동일 |
| 4. 통계 | **F5** 통계 화면 | — |
| 5. 뱃지 | **F6** 뱃지 컬렉션 | — |
| 6. 친구 랭킹 | **F7** 랭킹 API & 화면 | — |
| (비기능/공통) | **F8** 수익화 배치 & 검수 컴플라이언스 | PRD Monetization + 검수 요건에서 파생 |

- **기준 문서는 SPEC(F1~F8)**이며, 본 TASK의 모든 `Covers`는 SPEC AC 번호를 따른다.
- PRD "5. Recovery ads"는 SPEC **F4**로 추적되며, Task **2.4 / 3.3 / 2.2(canRecover)**가 담당한다 (미추적 아님).
- SPEC AC 총 64개(F1~F8 × 8개) 전부가 최소 1개 태스크에 매핑되어 있다(하단 AC Coverage 표).

### 레이어 순서 (엄격 준수)
```
Epic 1 (타입/순수유틸) → Epic 2 (storage → engine → hooks → API client)
  → Epic 3 (페이지 UI, 6개) → Epic 4 (라우팅/광고/컴플라이언스/스모크)
```
UI 레이어(Epic 3)는 `localStorage`·`fetch`를 직접 호출하지 않고 Epic 2 훅만 import한다(각 태스크 DoD로 강제).

### 파일 소유권 & 충돌 매트릭스
- 각 파일은 **생성 소유자 1개 태스크**를 가진다. 예외는 Task 4.2 하나이며, 이미 완성된 페이지 3종에 `<AdSlot>` 삽입만 수행한다(`Depends on: 4.1`로 직렬화되어 동시 편집 충돌 없음).
- 병렬 실행 가능 조합: (1.1) → (1.2, 2.1 병렬) → (2.2) → (2.3, 2.5 병렬) → (2.4) → (3.1~3.6 전부 병렬) → (4.1) → (4.2) → (4.3) → (4.4).

---

## Epic 1. 타입 & 순수 유틸 레이어

Risk Assessment
- Complexity: Low
- Risk factors: RouteState 누락 시 페이지 간 navigate 계약 불일치로 결과 화면 크래시. 날짜 유틸이 KST 강제 변환을 놓치면 F1~F5 계산이 전부 어긋남.
- Mitigation: 타입/유틸을 최초 태스크로 고정해 이후 모든 패킷이 동일 계약을 import. 날짜 유틸은 순수 함수라 단독 단위 테스트로 검증 가능.

### Task 1.1 엔티티 타입 + RouteState 정의
- Description: SPEC Data Models의 전 엔티티를 `src/lib/types.ts`에 타입으로만 선언한다(런타임 코드 0). 포함: `CheckInSource`, `CheckIn`, `StreakState`, `RecoveryWallet`, `RecoveryUsage`, `BadgeId`, `BadgeDef`, `EarnedBadge`, `Profile`, `RankEntry`, `AppFlags`, `SyncRequest`, `SyncResponse`, `JoinRequest`, `JoinResponse`, `RankResponse`, `ApiError`, `ApiErrorCode`, `AddCheckInResult = { ok: true } | { ok: false; reason: 'FUTURE_DATE' | 'DUPLICATE' | 'INVALID_DATE' | 'STORAGE_FULL' }`. 그리고 반드시 RouteState를 정의한다: `export type RouteState = { "/": undefined; "/calendar": { focusDate?: string } | undefined; "/recover": { targetDate: string } | undefined; "/stats": undefined; "/badges": { highlightBadgeId?: BadgeId } | undefined; "/rank": undefined; };`
- DoD: `npx tsc --noEmit` 통과. 파일 내 함수/변수 선언 0개(`export type`/`export interface`만 존재). `RouteState`의 키가 정확히 6개이며 S1~S6 Navigation state contract와 1:1 일치. `BadgeId` 유니온 멤버 정확히 9개. `LS_KEYS` 상수는 이 파일에 없음(Task 2.1 소유).
- Covers: [F1-AC-7, F3-AC-8, F4-AC-6, F6-AC-4]
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 KST 날짜 유틸 + BadgeDef 고정 테이블
- Description: `src/lib/date.ts`에 KST 고정 날짜 유틸을, `src/lib/badgeDefs.ts`에 뱃지 9종 테이블을 구현한다. 유틸: `todayKST(): string`(기기 TZ 무관 UTC+9 강제), `addDays(dateStr, n): string`, `diffDays(a, b): number`(a−b), `isValidDateStr(s): boolean`(`/^\d{4}-\d{2}-\d{2}$/` + 실제 존재 날짜), `formatKorean(dateStr): string` → `"2026년 8월 1일"`, `monthMatrix(year, month): (string|null)[][]`(7열 × 최대 6행, 패딩은 null), `weekdayKey(dateStr): 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN'`. 테이블: `BADGE_DEFS: BadgeDef[]`(SPEC 9행 그대로), `getBadgeDef(id: string): BadgeDef | undefined`.
- DoD: 시스템 TZ를 `UTC` / `America/New_York` / `Asia/Seoul`로 바꿔도 `todayKST()`가 KST 기준 동일 날짜 반환(테스트 3케이스 통과). `diffDays("2026-08-20","2026-08-18") === 2`. `addDays("2026-08-31", 1) === "2026-09-01"`. `monthMatrix(2026, 7)`이 7월 날짜 문자열 31개 + null 패딩을 포함하고 총 셀 수가 7의 배수. `BADGE_DEFS.length === 9`이며 id 중복 0건. `getBadgeDef('streak_999') === undefined`. 소스에 `Array.prototype.at` / `findLast` / `Object.groupBy` / `structuredClone` 사용 0건.
- Covers: [F3-AC-2, F6-AC-4, F8-AC-6]
- Files: [src/lib/date.ts, src/lib/badgeDefs.ts, src/lib/__tests__/date.test.ts]
- Depends on: Task 1.1

---

## Epic 2. 데이터 레이어 (storage → 계산 엔진 → 훅 → API 클라이언트)

Risk Assessment
- Complexity: Medium
- Risk factors: 손상 JSON·QuotaExceededError를 UI로 흘리면 앱 크래시(F1-AC-5, F1-AC-6). 파생 데이터 `StreakState` 캐시와 원본 `CheckIn[]` 불일치. storage+engine+훅을 한 패킷에 합치면 10분 초과.
- Mitigation: storage(2.1) → 순수 엔진(2.2) → 훅(2.3/2.4) → 네트워크(2.5) 5단 분리. 엔진은 순수 함수라 UI 없이 F1-AC-1~3, F5 계산 AC를 단위 테스트로 확정. streak 캐시는 저장 시마다 재계산 값으로 덮어써 불일치를 원천 차단.

### Task 2.1 localStorage 영속 레이어 (CRUD 전용)
- Description: `src/lib/storage.ts`에 키 상수와 엔티티 read/write 래퍼를 구현한다(계산 로직 0). `LS_KEYS = { checkins:'zss.v1.checkins', streak:'zss.v1.streak', recovery:'zss.v1.recovery', badges:'zss.v1.badges', profile:'zss.v1.profile', rankCache:'zss.v1.rankCache', flags:'zss.v1.flags' }`. `storage.get<T>(key, fallback): T` — JSON.parse 실패 또는 기대 타입 불일치 시 fallback 반환 및 해당 키를 fallback 직렬화 값으로 덮어씀. `storage.set<T>(key, value): boolean` — 예외 시 false 반환. 엔티티 래퍼: `readCheckIns/writeCheckIns`, `readStreak/writeStreak`, `readRecovery/writeRecovery`, `readBadges/writeBadges`, `readProfile/writeProfile`, `readRankCache/writeRankCache`, `readFlags/writeFlags`. `ensureProfile(): Profile` — 없으면 `deviceUserId`(UUID v4, `crypto.randomUUID` 미지원 시 폴백), `inviteCode`(`/^[A-Z0-9]{6}$/`), `nickname:''`, `roomCode:null`, `onboardedAt:null` 생성 후 저장.
- DoD: `localStorage['zss.v1.checkins'] = "{{{broken"` 상태에서 `readCheckIns()`가 `[]`를 반환하고 해당 키 값이 `"[]"`로 갱신됨. `storage.set`이 QuotaExceededError를 던지도록 모킹 시 `false`를 반환하고 예외가 밖으로 전파되지 않음. `readBadges()`가 `[{"id":"streak_999","earnedAt":1}]`를 예외 없이 배열로 반환. `ensureProfile()` 2회 호출 시 동일 `deviceUserId` 반환하고 `inviteCode`가 `/^[A-Z0-9]{6}$/` 만족. 파일 전체 `console.error` 호출 0건.
- Covers: [F1-AC-5, F1-AC-6, F7-AC-7, F8-AC-7]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1

### Task 2.2 스트릭·통계·뱃지 순수 계산 엔진
- Description: `src/lib/engine.ts`에 I/O 없는 순수 함수만 구현한다. `calcStreak(checkins, today): StreakState` — 마지막 체크인이 `today` 또는 `addDays(today,-1)`이면 그 연속 구간 길이가 `current`, 아니면 `current = 0`. `best`는 전 구간 최장 연속, `totalDays`는 고유 날짜 수(recovery 포함). `calcRate(checkins, today, windowDays, firstCheckInDate?)` → `{ rate, success, total }`, 분모는 `max(1, min(windowDays, 경과일))`, `rate`는 소수점 첫째자리 반올림. `calcWeeklyTrend(checkins, today): number[]`(최근 8주 성공일수, 과거→최신). `calcWeekdayRates(checkins, today): Record<'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT'|'SUN', number>`(최근 8주, 성공/기회×100 반올림). `evaluateBadges(streak, earned, opts?: { usedRecovery?: boolean }): BadgeId[]`(신규 획득만). `canRecover(date, today, checkins): { ok: boolean; reason?: 'TOO_OLD'|'ALREADY_CHECKED'|'FUTURE' }`(최근 7일 이내 & 미체크인만 ok).
- DoD: `calcStreak([08-18,08-19,08-20], "2026-08-20")` → `{current:3,best:3,lastCheckInDate:"2026-08-20",totalDays:3}`. `calcStreak([08-18,08-19], "2026-08-20")` → `current === 2`(오늘 미체크인이어도 어제 연속이면 유지). `calcStreak([08-10,08-11,08-17], "2026-08-20")` → `{current:0,best:2,lastCheckInDate:"2026-08-17",totalDays:3}`. `calcRate` 5/7 → `rate === 71.4`, 18/30 → `rate === 60`, 첫 체크인 08-18·today 08-20 주간 → `total === 3`. 월요일 8회 중 6회 → `calcWeekdayRates(...).MON === 75`. `evaluateBadges({current:8,...}, [{id:'streak_7'}])` 결과에 `streak_7` 미포함. `evaluateBadges(..., { usedRecovery: true })` 결과에 `comeback` 포함(미보유 시). `canRecover("2026-08-05","2026-08-20",[])` → `{ok:false,reason:'TOO_OLD'}`. 파일 전체에서 `localStorage` / `Date.now()` 직접 접근 0건.
- Covers: [F1-AC-1, F1-AC-2, F1-AC-3, F4-AC-6, F5-AC-1, F5-AC-2, F5-AC-4, F5-AC-6, F6-AC-2]
- Files: [src/lib/engine.ts, src/lib/__tests__/engine.test.ts]
- Depends on: Task 1.2

### Task 2.3 상태 훅 — useCheckIns
- Description: `src/hooks/useCheckIns.ts`에 storage + engine을 묶는 훅을 구현한다. 반환: `{ checkins, streak, isLoading, addCheckIn, hasCheckIn, getCheckInsInRange, reload, today }`. `addCheckIn(date, source, memo?): AddCheckInResult` 검증 순서 — 형식(`INVALID_DATE`) → 미래 날짜(`FUTURE_DATE`) → 중복(`DUPLICATE`) → memo 50자 초과 절삭 → 저장. 저장 실패 시 메모리 상태를 이전 배열로 롤백하고 `{ok:false, reason:'STORAGE_FULL'}` 반환. 저장 성공 시 `calcStreak` 재계산 결과를 `zss.v1.streak`에 기록(캐시는 항상 재계산 값 우선). `isLoading`은 초기 마운트 true → 첫 읽기 완료 후 false. `visibilitychange` 리스너로 `todayKST()` 재평가해 `today` 갱신, 언마운트 시 해제.
- DoD: 빈 상태에서 `addCheckIn("2026-08-20","manual","점심 도시락")` 후 `zss.v1.checkins`에 `date/source/memo`가 맞는 1건, `zss.v1.streak === {current:1,best:1,lastCheckInDate:"2026-08-20",totalDays:1}`. today=08-20에서 `addCheckIn("2026-08-21","manual")` → `{ok:false,reason:'FUTURE_DATE'}` 및 저장 0건. 동일 날짜 2회 호출 시 두 번째는 `{ok:false,reason:'DUPLICATE'}`이고 해당 날짜 항목 수 1 유지. `storage.set` 모킹 false → `{ok:false,reason:'STORAGE_FULL'}`이고 `checkins` 값이 호출 전과 값 동일. 51자 memo 전달 시 저장된 `memo.length === 50`. 초기 렌더 `isLoading === true`, effect 후 `false`. 언마운트 후 `visibilitychange` 리스너 0개. 손상 JSON 상태에서 마운트해도 `checkins === []`이고 `console.error` 0건. 캐시 위조(`zss.v1.streak.current = 99`) 후 마운트 시 노출 값이 재계산 결과와 일치.
- Covers: [F1-AC-4, F1-AC-6, F1-AC-7, F1-AC-8, F2-AC-5, F2-AC-6, F3-AC-6, F5-AC-7]
- Files: [src/hooks/useCheckIns.ts]
- Depends on: Task 2.1, Task 2.2

### Task 2.4 상태 훅 — useBadges / useRecovery / useProfile
- Description: 도메인 훅 3종을 구현한다. `src/hooks/useBadges.ts`: `{ earned, isLoading, grantBadges(ids): boolean, checkAndGrant(streak, opts): { granted: BadgeId[]; saved: boolean } }` — 읽는 시점에 `getBadgeDef` 미존재 ID 필터링, 저장 실패 시 `saved:false`. `src/hooks/useRecovery.ts`: `{ wallet, isLoading, canEarn, earnTicket(): {ok:boolean; reason?:'DAILY_LIMIT'|'MAX_TICKETS'|'STORAGE_FULL'}, useTicket(date): {ok:boolean; reason?:string} }` — `earnedTodayDate !== todayKST()`이면 `earnedToday`를 0으로 리셋 후 판정, `tickets` 상한 3·`earnedToday` 상한 1, `useTicket`은 `canRecover` 통과 시에만 티켓 차감 + `usages` 기록(CheckIn 저장은 호출부 책임). `src/hooks/useProfile.ts`: `{ profile, isLoading, setNickname(v): {ok:boolean; reason?:'INVALID_NICKNAME'}, setRoomCode(code), isOnboarded, markOnboarded() }` — 닉네임은 trim 후 2~10자만 허용, `markOnboarded()`는 `zss.v1.flags.onboardingSeen = true` + `profile.onboardedAt` 기록.
- DoD: `zss.v1.badges = [{"id":"streak_999","earnedAt":1}]`에서 `earned.length === 0`이고 예외 0건. `streak_7` 보유 + `current:8` → `checkAndGrant` 결과 `granted.length === 0`. `grantBadges`가 storage 실패 시 `false` 반환. `{tickets:1,earnedToday:1,earnedTodayDate:"2026-08-20"}`·today=08-20 → `canEarn === false`. `earnedTodayDate:"2026-08-19"`·today=08-20 → `canEarn === true`이고 `earnTicket()` 후 wallet이 `{tickets:1,earnedToday:1,earnedTodayDate:"2026-08-20"}`. `tickets:3` → `earnTicket()` → `{ok:false,reason:'MAX_TICKETS'}`. `setNickname("  ")` → `{ok:false,reason:'INVALID_NICKNAME'}` 및 미저장. `markOnboarded()` 후 재마운트 시 `isOnboarded === true`.
- Covers: [F4-AC-1, F4-AC-3, F4-AC-4, F6-AC-5, F6-AC-6, F7-AC-6, F8-AC-7]
- Files: [src/hooks/useBadges.ts, src/hooks/useRecovery.ts, src/hooks/useProfile.ts]
- Depends on: Task 2.1, Task 2.2

### Task 2.5 랭킹 API 클라이언트 (네트워크 격리)
- Description: `src/lib/rankApi.ts`에 외부 API 호출을 격리한다(UI에서 fetch 직접 호출 금지). `const BASE = import.meta.env.VITE_RANK_API_BASE ?? ''`, `isRankEnabled(): boolean`(BASE 빈 값이면 false → OQ-1 축소 렌더). `syncStreak(body: SyncRequest)`, `joinRoom(body: JoinRequest)`, `fetchRank(roomCode)` 모두 `{ok:true; data?} | {ok:false; code: ApiErrorCode}` 반환. 공통: `AbortController` 5,000ms 타임아웃, HTTP 상태 → `INVALID_PAYLOAD`|`ROOM_NOT_FOUND`|`NICKNAME_TAKEN`|`RATE_LIMITED`|`INTERNAL_ERROR`|`NETWORK` 매핑, 모든 예외 내부 catch(throw·console.error 금지). `fetchRank` 200 시 `zss.v1.rankCache = {fetchedAt, entries}` 저장.
- DoD: fetch reject 모킹 → `fetchRank` 결과 `{ok:false,code:'NETWORK'}`, 예외 전파 0건, `console.error` 0건. 404 모킹 → `joinRoom` 결과 `{ok:false,code:'ROOM_NOT_FOUND'}`. 5초 무응답 모킹 → 5,000ms 시점에 `{ok:false,code:'NETWORK'}` 반환. 200 모킹 → `zss.v1.rankCache.entries`가 응답 entries와 동일. `VITE_RANK_API_BASE`가 빈 값일 때 `isRankEnabled() === false`이고 세 함수 모두 fetch 호출 0회.
- Covers: [F7-AC-1, F7-AC-2, F7-AC-3, F7-AC-4]
- Files: [src/lib/rankApi.ts]
- Depends on: Task 1.1, Task 2.1

---

## Epic 3. 핵심 UI 페이지 (페이지당 1 태스크)

Risk Assessment
- Complexity: Medium
- Risk factors: `location.state`를 null 체크 없이 캐스팅해 새로고침·딥링크 시 크래시(2026-08-03 SplitMate 실사고 재발). TDS 컴포넌트에 인라인 padding/margin을 덮어써 검수 반려. 페이지가 localStorage/fetch에 직접 접근해 데이터 계약 붕괴.
- Mitigation: state 수신 화면(`/calendar`, `/recover`, `/badges`)마다 "state 없이 직접 진입해도 크래시 없음" DoD를 강제. 모든 페이지는 Epic 2 훅만 import(직접 localStorage/fetch 0건을 DoD로 검증). 간격은 `<Spacing size={N} />`만 사용, 색상은 `var(--tds-color-*)`만 사용.

### Task 3.1 홈 화면 `/` — 체크인 + 스트릭 히어로
- Description: `src/pages/HomePage.tsx` 구현. `ScreenScaffold` > `Top`("무지출 챌린지") > `SummaryHero`(`data-testid="streak-hero"`, 현재 스트릭 CountUp, t1) > `Spacing size={16}` > `Card`(`data-testid="streak-stat-card"`, 최고 기록·누적 일수 2열, 값 t3 강조, 탭 시 `navigate('/calendar')`) > `Spacing size={24}` > (AdSlot 자리, Task 4.2에서 삽입) > `Spacing size={16}` > `Card`(`data-testid="badge-preview-card"`, 최근 획득 뱃지 3개, 탭 시 `navigate('/badges')`). 1차 액션은 `SubmitFooter` 내 `Button display="block"`(`data-testid="checkin-button"`). 메모: `data-testid="memo-sheet-open"` 탭 → `BottomSheet` + `TextField`(maxLength 50, `enterKeyHint="done"`) + "저장". 상태 분기는 `useCheckIns()`로만 처리.
- DoD: 미체크인 상태에서 `checkin-button` 탭 → CheckIn 저장 + Toast `"오늘도 0원! 스트릭 1일째"` + `streak-hero` 숫자가 1로 CountUp. 이미 체크인 시 `checkin-button`이 `disabled`, 라벨 `"오늘 체크인 완료"`, 아래 `Chip` `"내일 다시 도전"` 렌더. 중복 저장 시도 → Toast `"오늘은 이미 체크인했어요"`, 해당 날짜 항목 수 1 유지. `STORAGE_FULL` 결과 → Toast `"저장 공간이 부족해요. 오래된 기록을 정리해주세요"`. 메모 시트에서 51자 입력 시 값이 50자로 잘리고 헬퍼 텍스트 `"메모는 50자까지 입력할 수 있어요"` 표시, "저장" 탭 시 memo 포함 저장 + 시트 닫힘. 체크인 0건 + 뱃지 0개 → `streak-hero` `0` + `Asset.ContentIcon` + `"첫 무지출 도전을 시작해보세요"`. `isLoading` 중 `data-testid="home-skeleton"` 렌더. `visibilitychange`로 날짜 변경 시 버튼 `enabled` 전환. `checkin-button` computed height ≥ 52px, `memo-sheet-open` ≥ 44px. 파일 내 `location.state` 접근 0건, TDS 컴포넌트 인라인 padding/margin 0건, HEX 색상 0건, `localStorage` 직접 호출 0건.
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7, F2-AC-8, F1-AC-8]
- Files: [src/pages/HomePage.tsx, src/pages/HomePage.css]
- Depends on: Task 2.3, Task 2.4

### Task 3.2 캘린더 화면 `/calendar`
- Description: `src/pages/CalendarPage.tsx` 구현. `ScreenScaffold` > `Top`("기록") > 월 헤더(`Paragraph.Text`, `"2026년 8월"`) + `data-testid="cal-prev"` / `data-testid="cal-next"` 버튼 > 7열 CSS Grid(`grid-template-columns: repeat(7, 1fr)`, 커스텀 CSS 허용). 각 셀 `data-testid="cal-cell-YYYY-MM-DD"` + `data-state="success"|"recovered"|"miss"|"future"`. 셀 탭 → `BottomSheet`에 `formatKorean(date)`, memo, 상태 `Chip`, 복구 가능 시 "복구하기" 버튼. Incoming state는 `const st = (useLocation().state as RouteState["/calendar"]) ?? null;`로 받고 `st?.focusDate`가 유효할 때만 해당 월로 초기 렌더, 아니면 `todayKST()` 기준 월.
- DoD: manual 날 `data-state="success"`, recovery 날 `data-state="recovered"`, 과거 미체크인 날 `data-state="miss"`, 미래 날 `data-state="future"`. `cal-prev` 탭 → 헤더 `"2026년 7월"` + 날짜 셀 31개. 표시 월이 오늘의 월이면 `cal-next`가 `disabled`이고 탭해도 헤더 불변. memo 있는 셀 탭 → BottomSheet에 `"2026년 8월 1일"`과 `"물만 마심"` 표시. 해당 월 체크인 0건 → 그리드 하단 `Asset.ContentIcon` + `"이 달에는 기록이 없어요"`. `isLoading` 중 `data-testid="cal-skeleton"` 렌더. 모든 `cal-cell-*` computed width/height ≥ 44px, 월 이동 버튼 ≥ 44×44px. 최근 7일 내 미체크인 셀 시트의 "복구하기" 탭 → `navigate('/recover', { state: { targetDate } })` 호출. state 없이 `/calendar` 직접 진입·새로고침해도 크래시 없이 오늘 기준 월 렌더. HEX 색상 0건.
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7, F3-AC-8]
- Files: [src/pages/CalendarPage.tsx, src/pages/CalendarPage.css]
- Depends on: Task 2.3

### Task 3.3 복구 화면 `/recover` — 리워드 광고 게이팅
- Description: `src/pages/RecoverPage.tsx` 구현. `ScreenScaffold` > `Top`(뒤로가기 + "스트릭 복구") > `Card`(`data-testid="ticket-card"`, 보유 복구권 수 t2 강조 + `Chip` `"오늘 획득 가능"`) > `Spacing size={16}` > `Card`(`data-testid="target-card"`, 복구 대상 날짜). 획득 버튼 `data-testid="earn-ticket"`은 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 게이팅. 1차 액션 `data-testid="use-ticket"`은 `SubmitFooter` 내 `display="block"`, 실행 전 `AlertDialog` 확인. Incoming state는 `const st = (useLocation().state as RouteState["/recover"]) ?? null;`로 받고, `st?.targetDate`가 없으면 최근 7일 내 첫 미체크인 날짜 자동 선택, 그것도 없으면 `"복구할 날짜가 없어요"` + `use-ticket` disabled. 성공 시 `useTicket(date)` + `addCheckIn(date,'recovery')` 후 `navigate('/calendar', { state: { focusDate: date }, replace: true })`.
- DoD: `{tickets:0,earnedToday:0,earnedTodayDate:"2026-08-19"}`·today=08-20에서 광고 시청 완료 → wallet `{tickets:1,earnedToday:1,earnedTodayDate:"2026-08-20"}` + Toast `"복구권 1개를 받았어요"`. `tickets:1`·타깃 `"2026-08-18"`(checkins 08-17/08-19/08-20)에서 `use-ticket` 탭 → `CheckIn{date:"2026-08-18",source:"recovery"}` 저장, `tickets === 0`, `calcStreak().current === 4`, Toast `"2026년 8월 18일을 복구했어요"`. `earnedToday:1`·같은 날 → `earn-ticket` `disabled`, 라벨 `"오늘은 이미 받았어요"`, 광고 로드 호출 0회. `tickets:3` → `earn-ticket` `disabled` + 헬퍼 `"복구권은 최대 3개까지 보유할 수 있어요"`. 광고 중도 종료 콜백 → `tickets` 불변 + Toast `"광고를 끝까지 봐야 복구권을 받을 수 있어요"`. `targetDate="2026-08-05"`·today=08-20 → `use-ticket` `disabled` + `"최근 7일 이내 날짜만 복구할 수 있어요"`. 광고 로드 중 `earn-ticket`이 `loading` 상태이며 연속 3회 탭해도 로드 호출 1회. `tickets === 0` → `"광고를 보고 복구권을 받아보세요"` + `use-ticket` disabled. state 없이 `/recover` 직접 진입해도 크래시 없이 자동 선택 또는 빈 상태 렌더. 모든 버튼 computed height ≥ 52px. 이 화면에 `AdSlot` 배너 0개.
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-8]
- Files: [src/pages/RecoverPage.tsx]
- Depends on: Task 2.3, Task 2.4

### Task 3.4 통계 화면 `/stats`
- Description: `src/pages/StatsPage.tsx` 구현. `ScreenScaffold` > `Top`("통계") > `Tab`(`주간`/`월간`, 라우트 진입 시 로컬 state를 항상 `주간`으로 초기화) > `SummaryHero`(`data-testid="rate-hero"`, 달성률 % CountUp) > `Paragraph.Text`(`data-testid="rate-detail"`) > `Spacing size={16}` > `Card`(`data-testid="trend-card"`, 8주 `Sparkline`) > `Spacing size={12}` > `Card`(`data-testid="weekday-card"`, `MiniBar` 7개, 각 `data-testid="weekday-bar-{MON..SUN}"` + `data-value`) > `Spacing size={24}` > (AdSlot 자리, Task 4.2에서 삽입). 모든 수치는 `engine.ts` 호출로만 산출하고, 계산부는 try/catch로 감싼다.
- DoD: today=08-20·최근 7일 중 5일 성공 → 주간 탭 `rate-hero`가 `71.4%` 표시. 월간 탭 선택·최근 30일 중 18일 → `rate-hero` `60%`, `rate-detail` `"30일 중 18일 성공"`. `rate-hero`·`trend-card`·`weekday-card` 3개 testid가 모두 DOM에 존재하고 `weekday-bar-*`가 정확히 7개. 월요일 8회 중 6회 → `weekday-bar-MON`의 `data-value === "75"`. checkins `[]` → `rate-hero` `0%` + `Asset.ContentIcon` + `"기록이 쌓이면 통계를 보여드릴게요"`이고 Sparkline/MiniBar 미마운트. 첫 체크인 08-18·today 08-20 → 주간 탭 `rate-detail`이 `"3일 중 N일 성공"`. `isLoading` 중 `data-testid="stats-skeleton"` 렌더 + 차트 미마운트. `/stats` → `/calendar` → `/stats` 재진입 시 탭이 `주간`으로 초기화되고 주간 값 표시. 계산 예외 주입 시 `"통계를 계산하지 못했어요"` Card 렌더되고 앱 크래시 없음. `Tab` 각 항목 높이 ≥ 44px. 파일 내 `location.state` 접근 0건.
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-5, F5-AC-6, F5-AC-7, F5-AC-8]
- Files: [src/pages/StatsPage.tsx, src/pages/StatsPage.css]
- Depends on: Task 2.3

### Task 3.5 뱃지 컬렉션 `/badges` + 신규 획득 AlertDialog
- Description: `src/pages/BadgesPage.tsx`와 `src/components/BadgeGrantDialog.tsx` 구현. 3열 CSS Grid(`repeat(3, 1fr)`, 커스텀 CSS 허용), 셀 `data-testid="badge-{id}"` + `data-earned="true"|"false"`, 미획득 셀은 `opacity` + 회색 `var(--tds-color-*)`. 상단 `Card`(획득 요약 N/9), 하단 (AdSlot 자리, Task 4.2에서 삽입). 셀 탭 → `BottomSheet`에 이름·설명·조건 안내(잔여 일수 포함). `BadgeGrantDialog`는 `checkAndGrant` 결과를 받아 TDS `AlertDialog`로 `"{name} 뱃지 획득!"`을 1회 노출하고, 저장 실패 시 Toast로 대체한다. Incoming state는 `const st = (useLocation().state as RouteState["/badges"]) ?? null;`로 받고 `st?.highlightBadgeId`가 정의된 뱃지일 때만 강조 테두리 적용.
- DoD: `earned=[first_step, streak_3]` → 해당 2셀 `data-earned="true"`, 나머지 7셀 `"false"`, 총 셀 9개. `zss.v1.badges`에 `streak_999`가 있어도 9개만 렌더되고 런타임 에러 0건. `earned=[]` → 9셀 모두 `false` + 상단 `"첫 체크인으로 '첫 걸음' 뱃지를 받아보세요"`. `streak_30` 미획득·`current === 12`에서 `badge-streak_30` 탭 → BottomSheet에 `"연속 30일 달성 시 획득 · 18일 남음"`. 체크인 후 `current === 7` & `streak_7` 미보유 → AlertDialog 제목 `"일주일 완주 뱃지 획득!"` 표시되고 `zss.v1.badges`에 `{id:"streak_7",earnedAt:<number>}` 추가, 재진입 시 재노출 0회. `current === 8` & `streak_7` 보유 → AlertDialog 미노출, `streak_7` 항목 수 1 유지. 복구권 최초 사용으로 `source:"recovery"` 저장 → AlertDialog 제목 `"다시 시작 뱃지 획득!"`. `grantBadges`가 false 반환 → AlertDialog 대신 Toast `"뱃지 저장에 실패했어요. 잠시 후 다시 시도해주세요"`. `isLoading` 중 `data-testid="badges-skeleton"` 9셀 렌더. state 없이 `/badges` 직접 진입해도 크래시 없이 강조 없는 그리드 렌더. 모든 `badge-*` 셀 computed width/height ≥ 88px.
- Covers: [F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8]
- Files: [src/pages/BadgesPage.tsx, src/pages/BadgesPage.css, src/components/BadgeGrantDialog.tsx]
- Depends on: Task 2.3, Task 2.4

### Task 3.6 랭킹 화면 `/rank` — 참여 & 순위 리스트
- Description: `src/pages/RankPage.tsx` 구현. 미참여(`roomCode === null`): `Card`(`data-testid="my-invite-card"`, 초대 코드 t2 강조 + `data-testid="copy-invite"`) > `Spacing size={16}` > `TextField`(`data-testid="join-input"`, `autoCapitalize="characters"`, `maxLength={6}`, `enterKeyHint="done"`) > `SubmitFooter`의 `data-testid="join-submit"` `display="block"` 버튼 + `Asset.ContentIcon` + `"친구 코드를 입력하고 순위를 겨뤄보세요"`. 참여 상태: `ListRow` 순위 리스트(left=순위, contents=닉네임, right=스트릭), 행 `data-testid="rank-row-{userId}"`, 본인 행 `data-me="true"` + 배경 강조, 20건 초과 시 윈도잉. 닉네임 미설정 시 `BottomSheet`로 설정(`useProfile.setNickname`). 네트워크 실패 시 `zss.v1.rankCache` 렌더 + `Chip` `"오프라인 · 마지막 갱신 결과"`. `isRankEnabled() === false`면 초대 코드 Card만 축소 렌더. 초대는 클립보드 복사만 사용한다.
- DoD: `join-input`에 `"AB12CD"` 입력 + `join-submit` 탭, 서버 200 → `zss.v1.profile.roomCode === "AB12CD"`이고 랭킹 리스트 렌더. entries 1건 응답 → `rank-row-u1`에 `"1위"`, `"절약러"`, `"7일"` 포함, `userId === deviceUserId`인 행만 `data-me="true"`. 404 응답 → TextField 하단 `"존재하지 않는 초대 코드예요"`이고 `roomCode`는 `null` 유지. `fetchRank` NETWORK 실패 + 캐시 3건 → 3행 렌더 + `Chip` `"오프라인 · 마지막 갱신 결과"` + `console.error` 0건. 닉네임 `"  "` 저장 시도 → `"닉네임은 2~10자로 입력해주세요"` 표시 및 미저장. 요청 중 `data-testid="rank-skeleton"` 5행 렌더. `roomCode === null` → `Asset.ContentIcon` + 안내 문구 + 초대 코드 Card 렌더. `copy-invite` 탭 → 클립보드 값 `"K3M9QZ"` + Toast `"초대 코드를 복사했어요"`, 파일 내 `window.open` / `window.location.href` 문자열 0건. 25건 응답 시 동시 마운트된 `rank-row-*` 노드 수 ≤ 20. `ListRow` 높이 ≥ 56px, `copy-invite` ≥ 44px. 파일 내 `location.state` 접근 0건, 직접 `fetch` 호출 0건.
- Covers: [F7-AC-1, F7-AC-2, F7-AC-4, F7-AC-5, F7-AC-6, F7-AC-7, F7-AC-8]
- Files: [src/pages/RankPage.tsx, src/pages/RankPage.css]
- Depends on: Task 2.4, Task 2.5

---

## Epic 4. 통합 + 컴플라이언스

Risk Assessment
- Complexity: Medium
- Risk factors: 라우팅 연결 시 `RouteState` 미준수 navigate가 섞이면 state 크래시 실사고 재발. 검수 반려 요소(HEX 하드코딩, console.error, 외부 이탈, 레거시 미지원 API)는 빌드 직전까지 드러나지 않음. 광고 배치가 `SubmitFooter`/`FloatingTabBar`와 겹치면 반려. 단위 테스트만으로는 화면 간 데이터 전파(체크인 → 캘린더/통계/뱃지) 회귀를 못 잡음.
- Mitigation: 라우팅(4.1)을 페이지 완성 후 배치해 state 계약을 한곳에서 tsc로 검증. 광고 배치(4.2)를 스크롤 콘텐츠 흐름 내부로 고정. 컴플라이언스(4.3)는 grep 기반 스크립트로 사람 판단 없이 0건을 증명하고 build에 선행 연결. 크로스 화면 회귀는 4.4 통합 스모크 테스트로 고정.

### Task 4.1 라우팅 연결 + FloatingTabBar + 온보딩 시트 + 동기화 훅
- Description: `src/App.tsx`에 `BrowserRouter` + 6개 라우트(`/`, `/calendar`, `/recover`, `/stats`, `/badges`, `/rank`)를 등록하고 미정의 경로는 `<Navigate to="/" replace />` 처리한다. 템플릿 제공 `FloatingTabBar`로 홈·기록·통계·뱃지·랭킹 이동을 연결한다. 앱 마운트 시 `ensureProfile()` 1회 호출. 첫 실행 온보딩: `useProfile().isOnboarded === false`이면 `BottomSheet`에 `"하루 지출 0원에 성공하면 체크인하세요"` + `"시작하기"` 버튼 → `markOnboarded()`. `src/hooks/useStreakSync.ts`를 추가해 체크인 성공 시 `roomCode`가 있으면 `syncStreak()`를 1회 호출하고 실패해도 UI에 영향을 주지 않게 한다.
- DoD: 6개 라우트 모두 직접 URL 진입 시 크래시 없이 렌더되며 `/recover`·`/calendar`·`/badges`는 state 없이 진입해도 기본값/빈 상태 렌더. `/unknown` 진입 → `/`로 replace 리다이렉트. 모든 `navigate(...)` 호출의 state 형태가 `RouteState` 해당 키 타입과 일치하고 `npx tsc --noEmit` 통과, 소스 내 `as any` 0건. `FloatingTabBar` 항목 5개가 각 라우트로 이동하며 현재 탭이 활성 표시됨. `onboardingSeen === false`에서 최초 진입 시 안내 BottomSheet 노출, `"시작하기"` 탭 후 `zss.v1.flags.onboardingSeen === true`, 재진입 시 미노출. `roomCode` 설정 상태에서 체크인 성공 → `POST /v1/sync`가 `{userId,nickname,roomCode,currentStreak,bestStreak,totalDays}` 바디로 정확히 1회 호출. `roomCode === null`이면 sync 호출 0회. `isRankEnabled() === false`면 sync 호출 0회이며 예외 0건.
- Covers: [F7-AC-3, F8-AC-7]
- Files: [src/App.tsx, src/hooks/useStreakSync.ts]
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

### Task 4.2 배너 광고 배치 3곳 + 레이아웃 안전성
- Description: `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`를 정확히 3곳에 배치한다 — `/`(스트릭 통계 카드와 뱃지 미리보기 카드 사이), `/stats`(통계 카드 전체 하단), `/badges`(그리드 하단). 광고 컨테이너는 스크롤 콘텐츠 흐름 내부에 두어 `SubmitFooter`·`FloatingTabBar`와 겹치지 않게 하고, 로드 실패 시 높이 0으로 접히도록 래퍼에 `min-height`를 지정하지 않으며 실패 시 렌더를 스킵한다(에러 문구·회색 박스 금지). 기존 페이지 파일은 **AdSlot 삽입 라인 외 변경 금지**(3.1/3.4/3.5의 DoD를 깨지 않게 diff 최소화).
- DoD: `src/pages` 전체에서 `<AdSlot` 출현 횟수가 정확히 3(홈·통계·뱃지 각 1)이고 `/calendar`·`/rank`·`/recover`에는 0. 각 AdSlot 컨테이너의 computed `position`이 `fixed`/`sticky`가 아니며 `SubmitFooter`·`FloatingTabBar`와 bounding rect 교차 0. 광고 로드 실패 시 AdSlot 래퍼 computed height === 0이고 로드 전후 하위 콘텐츠 `offsetTop` 변화 0. 로드 실패 시 DOM에 에러 문구·플레이스홀더 박스 노드 0개. Task 3.1/3.4/3.5의 기존 `data-testid` 전부가 여전히 DOM에 존재.
- Covers: [F8-AC-1, F8-AC-8]
- Files: [src/pages/HomePage.tsx, src/pages/StatsPage.tsx, src/pages/BadgesPage.tsx, src/components/AdSlotWrapper.css]
- Depends on: Task 4.1

### Task 4.3 검수 컴플라이언스 검증 스크립트 + 빌드 타깃 설정
- Description: `scripts/compliance-check.mjs`를 작성해 반려 요소를 자동 검사하고 `vite.config.ts`의 `build.target`을 `'es2019'`로 설정한다. 검사 항목(전부 0건이어야 exit 0): (1) `src/**/*.{ts,tsx}`의 `window.location.href =` / `window.open(`, (2) `src/**/*.{ts,tsx,css}`의 `/#[0-9a-fA-F]{3,8}\b/`, (3) `google-analytics`/`gtag`/`amplitude`/`mixpanel`, (4) UI 텍스트 내 `"설치"`/`"다운로드"`/`"앱스토어"`/`"플레이스토어"`, (5) `.at(`/`Object.groupBy`/`structuredClone`/`.findLast(`, (6) `console.error(`, (7) 금지 UI 라이브러리 import(`shadcn`/`@mui/`/`antd`/`@chakra-ui/`). `package.json`에 `"compliance": "node scripts/compliance-check.mjs"`를 추가하고 `build`가 이를 선행 실행하게 연결한다.
- DoD: `npm run compliance` 실행 시 7개 항목 전부 0건으로 exit code 0. 임의로 `const c = '#FFF'`를 소스에 추가하면 exit code 1과 파일·라인이 출력됨. 임의로 `import { Button } from '@mui/material'`를 추가하면 exit code 1. `vite.config.ts`의 `build.target === 'es2019'`이고 `npm run build` 성공. compliance 실패 시 `npm run build`가 중단됨. 프로덕션 빌드로 `/` → `/calendar` → `/stats` → `/badges` → `/rank`를 순차 방문했을 때 `console.error` 호출 0회.
- Covers: [F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-5, F8-AC-6]
- Files: [scripts/compliance-check.mjs, vite.config.ts, package.json]
- Depends on: Task 4.2

### Task 4.4 (신규) 크로스 화면 통합 스모크 테스트
- Description: `src/__tests__/smoke.integration.test.tsx`에 화면 간 데이터 전파 회귀를 고정하는 통합 테스트를 작성한다(실 라우터 + 실 훅 + localStorage 모킹, 네트워크만 스텁). 시나리오 3종: (S-A) 홈 체크인 → `/calendar` 셀 상태 → `/stats` 달성률 → `/badges` 뱃지 획득까지 한 흐름. (S-B) `/calendar` 미체크인 셀 → "복구하기" → `/recover` state 수신 → 복구 완료 → `/calendar` 복귀 시 `data-state="recovered"`. (S-C) 랭킹 미참여 → 방 참여 200 → 체크인 시 sync 1회 호출. 새 프로덕션 코드는 작성하지 않으며, 실패 시 원인 태스크(3.x/4.1)로 되돌린다.
- DoD: today=`2026-08-20` 고정 하에 S-A 실행 시 홈 `checkin-button` 탭 후 `/calendar`의 `cal-cell-2026-08-20`이 `data-state="success"`, `/stats`의 `rate-hero`가 `0%`가 아닌 값, `/badges`의 `badge-first_step`이 `data-earned="true"`. S-B 실행 시 `/recover` 진입 직후 `target-card`에 `"2026년 8월 18일"` 표시되고 완료 후 `/calendar`의 `cal-cell-2026-08-18`이 `data-state="recovered"`, `zss.v1.recovery.tickets`가 1 감소. S-C 실행 시 `joinRoom` 200 스텁 후 체크인 1회에 `syncStreak` 스텁이 정확히 1회 호출. 3개 시나리오 전부에서 `console.error` 0회, 처리되지 않은 Promise rejection 0건. `npm test` exit code 0.
- Covers: [F1-AC-4, F3-AC-3, F4-AC-2, F5-AC-3, F6-AC-1, F7-AC-3] (회귀 보강 — 1차 담당 태스크는 별도 존재)
- Files: [src/__tests__/smoke.integration.test.tsx]
- Depends on: Task 4.3

---

## AC Coverage

- Total ACs in SPEC: 64 (F1~F8 × 8)
- Covered by tasks: 64
- Uncovered: 0
- Orphan task (어떤 AC도 커버하지 않는 태스크): 0 — Task 4.4는 기존 AC의 **회귀 보강**으로 매핑됨

| AC | 1차 담당 Task | 보강 |
|---|---|---|
| F1-AC-1 | 2.2 | — |
| F1-AC-2 | 2.2 | — |
| F1-AC-3 | 2.2 | — |
| F1-AC-4 | 2.3 | 4.4 |
| F1-AC-5 | 2.1 | — |
| F1-AC-6 | 2.1, 2.3 | — |
| F1-AC-7 | 1.1, 2.3 | — |
| F1-AC-8 | 2.3, 3.1 | — |
| F2-AC-1 | 3.1 | — |
| F2-AC-2 | 3.1 | — |
| F2-AC-3 | 3.1 | — |
| F2-AC-4 | 3.1 | — |
| F2-AC-5 | 2.3, 3.1 | — |
| F2-AC-6 | 2.3, 3.1 | — |
| F2-AC-7 | 3.1 | — |
| F2-AC-8 | 3.1 | — |
| F3-AC-1 | 3.2 | — |
| F3-AC-2 | 1.2, 3.2 | — |
| F3-AC-3 | 3.2 | 4.4 |
| F3-AC-4 | 3.2 | — |
| F3-AC-5 | 3.2 | — |
| F3-AC-6 | 2.3, 3.2 | — |
| F3-AC-7 | 3.2 | — |
| F3-AC-8 | 1.1, 3.2 | — |
| F4-AC-1 | 2.4, 3.3 | — |
| F4-AC-2 | 3.3 | 4.4 |
| F4-AC-3 | 2.4, 3.3 | — |
| F4-AC-4 | 2.4, 3.3 | — |
| F4-AC-5 | 3.3 | — |
| F4-AC-6 | 1.1, 2.2, 3.3 | — |
| F4-AC-7 | 3.3 | — |
| F4-AC-8 | 3.3 | — |
| F5-AC-1 | 2.2, 3.4 | — |
| F5-AC-2 | 2.2, 3.4 | — |
| F5-AC-3 | 3.4 | 4.4 |
| F5-AC-4 | 2.2, 3.4 | — |
| F5-AC-5 | 3.4 | — |
| F5-AC-6 | 2.2, 3.4 | — |
| F5-AC-7 | 2.3, 3.4 | — |
| F5-AC-8 | 3.4 | — |
| F6-AC-1 | 3.5 | 4.4 |
| F6-AC-2 | 2.2, 2.4, 3.5 | — |
| F6-AC-3 | 3.5 | — |
| F6-AC-4 | 1.1, 1.2, 3.5 | — |
| F6-AC-5 | 2.4, 3.5 | — |
| F6-AC-6 | 2.4, 3.5 | — |
| F6-AC-7 | 3.5 | — |
| F6-AC-8 | 3.5 | — |
| F7-AC-1 | 2.5, 3.6 | — |
| F7-AC-2 | 2.5, 3.6 | — |
| F7-AC-3 | 2.5, 4.1 | 4.4 |
| F7-AC-4 | 2.5, 3.6 | — |
| F7-AC-5 | 3.6 | — |
| F7-AC-6 | 2.4, 3.6 | — |
| F7-AC-7 | 2.1, 3.6 | — |
| F7-AC-8 | 3.6 | — |
| F8-AC-1 | 4.2 | — |
| F8-AC-2 | 4.3 | — |
| F8-AC-3 | 4.3 | — |
| F8-AC-4 | 4.3 | — |
| F8-AC-5 | 4.3 | — |
| F8-AC-6 | 1.2, 4.3 | — |
| F8-AC-7 | 2.1, 2.4, 4.1 | — |
| F8-AC-8 | 4.2 | — |

---

### 태스크 요약 (총 14개)

| Epic | Task | 예상 소요 |
|---|---|---|
| 1 | 1.1 타입 + RouteState | ~6분 |
| 1 | 1.2 KST 유틸 + BadgeDef | ~8분 |
| 2 | 2.1 storage | ~8분 |
| 2 | 2.2 engine | ~10분 |
| 2 | 2.3 useCheckIns | ~9분 |
| 2 | 2.4 badges·recovery·profile 훅 | ~10분 |
| 2 | 2.5 rankApi | ~8분 |
| 3 | 3.1 홈 | ~10분 |
| 3 | 3.2 캘린더 | ~10분 |
| 3 | 3.3 복구(리워드 광고) | ~10분 |
| 3 | 3.4 통계 | ~10분 |
| 3 | 3.5 뱃지 | ~10분 |
| 3 | 3.6 랭킹 | ~10분 |
| 4 | 4.1 라우팅 + 온보딩 + sync | ~9분 |
| 4 | 4.2 광고 배치 | ~5분 |
| 4 | 4.3 컴플라이언스 + 빌드 타깃 | ~7분 |
| 4 | 4.4 통합 스모크 테스트 (신규) | ~9분 |

---

## 변경 요약 (v1 → v2)

1. **§0 문서 정합성 노트 추가** — PRD 6기능 ↔ SPEC 8기능(F8 포함) 매핑을 명시해 "F8이 PRD에 없다" 갭 해소. PRD "Recovery ads" = SPEC F4 = Task 2.2/2.4/3.3으로 추적 경로 명시.
2. **레이어 순서·파일 소유권 매트릭스 명문화** — Epic 1→2→3→4 직렬, 병렬 가능 조합 명시. 유일한 다중 편집 지점(4.2)을 `Depends on: 4.1`로 직렬화해 충돌 0 증명.
3. **Task 4.4 통합 스모크 테스트 신설** — 단위 테스트로는 못 잡는 화면 간 데이터 전파(체크인→캘린더→통계→뱃지, 복구 왕복, 참여→sync) 회귀를 고정.
4. **Task 2.3 DoD 보강** — `StreakState` 캐시 위조 시 재계산 값 우선(SPEC 파생 데이터 제약) 검증 추가.
5. **Task 4.1 DoD 보강** — `isRankEnabled() === false`일 때 sync 호출 0회 조건 추가(로컬 전용 모드 P5).
6. **Task 4.2 Description 보강** — AdSlot 삽입 외 diff 금지 + 기존 testid 보존 DoD로 3.1/3.4/3.5 회귀 방지.
7. **Task 4.3 검사 항목 (7) 추가** — 금지 UI 라이브러리(shadcn/MUI/antd/Chakra) import 검출로 즉시 반려 요소 자동 차단.