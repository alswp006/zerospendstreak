# TASK — ZeroSpendStreak

> 교차검증 반영판(v2). 변경 요약은 문서 끝 **Changelog (v1 → v2)** 참조.
> 커버리지 기준: SPEC 66 ACs (F1:8, F2:8, F3:8, F4:8, F5:8, F6:8, F7:9, F8:9) + CP-1~7.

---

## 문서 정합성 메모 (PRD ↔ SPEC)

| 항목 | PRD | SPEC | 처리 |
|---|---|---|---|
| 스택 | "Vite + React + TDS" | "+ TypeScript + React Router + localStorage" | **인프라 결정으로 확정.** TypeScript=타입 계약(Task 1.1), React Router=5개 화면 전환(F8-AC1), localStorage=서버 없는 영속성(CP-4). PRD 목표를 확장하지 않고 구현 수단만 명시 → Task 0.1 DoD에서 의존성 고정으로 검증 |
| 외부 API 서버 | 미기재 | F7 랭킹만 별도 Railway 배포 | Task 3.1에서 `VITE_API_BASE_URL` 참조만 하고, 미설정 시 랭킹만 잠금·나머지 오프라인 동작 (Task 0.1 DoD) |

---

## Epic 0. Project Setup

**Risk Assessment**
- Complexity: Low
- Risk factors: 하위 태스크 DoD가 "mock 호출 1회 확인", "테스트 통과"를 요구하는데 테스트 러너가 없으면 검증 불가; env 키 이름이 태스크마다 갈리면 콘솔 주입값과 불일치
- Mitigation: 테스트 하네스와 env 키를 최초 1회 고정하고 이후 모든 태스크가 이를 재사용

### Task 0.1 환경변수 계약 + 테스트 하네스
- Description: `.env.example`에 4개 키(`VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID`, `VITE_TOSS_IAP_SKU`, `VITE_API_BASE_URL`)를 정의하고, `src/vite-env.d.ts`에 `ImportMetaEnv` 타입을 선언한다. vitest + jsdom + `@testing-library/react`를 설치하고 `vitest.config.ts`, `src/test/setup.ts`(localStorage 초기화, `@apps-in-toss/web-framework` 기본 mock)를 추가한다.
- DoD:
  - `.env.example`에 위 4개 키가 모두 존재하고 값은 비어 있음(실키 커밋 0건)
  - `import.meta.env.VITE_API_BASE_URL`이 `string | undefined`로 타입 추론됨 (`npx tsc --noEmit` 통과)
  - `npm run test`가 존재하고, 샘플 테스트 1건이 통과
  - 각 테스트 시작 시 `localStorage.clear()`가 자동 실행됨(setup 파일에 `beforeEach`)
  - `package.json` dependencies에 shadcn/MUI/antd/chakra 0건, `@toss/tds-mobile`·`react-router-dom` 존재
  - `VITE_API_BASE_URL` 미설정 상태에서 `npm run build` 성공
- Covers: [CP-1(의존성 고정), CP-6(env 키 계약), F8-AC6(부분)]
- Files: `.env.example`, `src/vite-env.d.ts`, `vitest.config.ts`, `src/test/setup.ts`, `package.json`
- Depends on: none

---

## Epic 1. Types & Contracts

**Risk Assessment**
- Complexity: Low
- Risk factors: RouteState 누락 시 페이지 간 navigate 데이터 불일치·런타임 크래시; DateKey를 string으로만 두면 페이지마다 날짜 계산이 갈라짐
- Mitigation: 타입 + RouteState를 최초 태스크로 고정해 이후 모든 스토리지/페이지 패킷이 동일 계약을 import하도록 강제

### Task 1.1 엔티티 타입 + RouteState 정의
- Description: `src/lib/types.ts`에 SPEC Data Models 전체(DateKey, CheckIn, CheckInStore, StreakState, RecoveryState, BadgeId, BadgeRecord, BadgeStore, FriendGroup, RankingEntry, RankingCache, AppFlags)와 스토리지 키 상수(`STORAGE_KEYS`), 뱃지 고정 테이블(`BADGE_TABLE`), RouteState 타입을 순수 타입/상수로만 정의한다. 런타임 로직 없음.
- DoD:
  - `export type DateKey = string`, 11개 인터페이스/타입이 SPEC 필드·제약과 1:1 일치
  - 아래 4개 모델이 정확히 다음 필드를 가짐:
    ```ts
    export interface FriendGroup { version: 1; groupCode: string; memberId: string; nickname: string }
    export interface RankingEntry { memberId: string; nickname: string; current: number; best: number; rank: number; isMe: boolean }
    export interface RankingCache { version: 1; groupCode: string; entries: RankingEntry[]; fetchedAt: number }
    export interface AppFlags { version: 1; onboardingSeen: boolean }
    ```
  - `BADGE_TABLE: Record<BadgeId, { label: string; conditionText: string }>`의 키가 정확히 8개(D3,D7,D14,D30,D50,D100,TOTAL30,PERFECT_WEEK)이고 각 항목에 label·conditionText 존재
  - RouteState가 아래와 동일하게 정의됨:
    ```ts
    export type RouteState = {
      "/": { justJoinedGroup: true } | undefined;
      "/streak": { focusMonth: string } | undefined;   // 'YYYY-MM'
      "/stats": undefined;
      "/ranking": { openJoinSheet: true } | undefined;
      "/badges": { highlightBadgeId: BadgeId } | undefined;
    };
    ```
  - `STORAGE_KEYS`에 7개 키가 모두 존재: `zss:checkins:v1`, `zss:streak:v1`, `zss:recovery:v1`, `zss:badges:v1`, `zss:friendGroup:v1`, `zss:rankingCache:v1`, `zss:flags:v1`
  - `npx tsc --noEmit` 통과, HEX 색상 리터럴 0건, import 문 0건(외부 의존성 없음)
- Covers: [F1-AC7(타입 기반), F6-AC1, F6-AC2, F8-AC4(부분), CP-4(키 규약)]
- Files: `src/lib/types.ts`
- Depends on: Task 0.1

### Task 1.2 날짜 유틸 (KST DateKey)
- Description: `src/lib/date.ts`에 KST 기준 날짜 유틸을 구현한다: `getTodayKey(now = new Date()): DateKey`, `toDateKey(d: Date)`, `parseDateKey(k: DateKey): Date | null`(유효하지 않으면 null), `addDays(k, n)`, `diffDays(a, b)`, `getWeekKey(k): string`(ISO 'YYYY-Www'), `getMonthDays(year, month): DateKey[]`, `isFuture(k, today)`, `formatKoreanDate(k): string`(`'2026년 8월 18일'`).
- DoD:
  - `getTodayKey(new Date('2026-08-19T14:59:59Z'))==='2026-08-19'`, `getTodayKey(new Date('2026-08-19T15:00:00Z'))==='2026-08-20'` (KST 00:00 경계)
  - `parseDateKey('2026-13-45') === null`, `parseDateKey('') === null`, `parseDateKey('2026-02-30') === null`
  - `getWeekKey('2026-08-19') === '2026-W34'`
  - `getMonthDays(2026, 8).length === 31`, 첫 원소 `'2026-08-01'`; `getMonthDays(2028, 2).length === 29`
  - `diffDays('2026-08-16','2026-08-19') === 3`, `addDays('2026-08-31', 1) === '2026-09-01'`
  - `formatKoreanDate('2026-08-18') === '2026년 8월 18일'`
  - `Array.prototype.at`/`findLast`/`Object.groupBy`/`structuredClone` 미사용
- Covers: [CP-3, F1-AC2, F5-AC8, F4-AC6, F8-AC7]
- Files: `src/lib/date.ts`
- Depends on: Task 1.1

---

## Epic 2. Data Layer

**Risk Assessment**
- Complexity: Medium
- Risk factors: 손상 JSON/QuotaExceededError로 앱 크래시; 스트릭 캐시와 재계산 결과 불일치; 복구권 주간 카운터 리셋 누락
- Mitigation: storage(원시 read/write) → 스트릭 엔진(순수 함수) → 복구/뱃지 → React 스토어 순으로 분리해, 각 계층이 하위 계층만 의존하고 태스크당 파일을 배타 할당

### Task 2.1 안전한 localStorage 헬퍼
- Description: `src/lib/storage.ts`에 `readStore<T>(key, fallback, guard: (v:unknown)=>boolean): T`와 `writeStore<T>(key, value): { ok: true } | { ok: false; reason: 'STORAGE_FULL' }`를 구현한다. read는 try/catch + version/shape 런타임 가드, 실패 시 fallback으로 초기화 후 저장. write는 QuotaExceededError catch. `console.error` 호출 금지.
- DoD:
  - `localStorage['zss:checkins:v1'] = '{broken'` 상태에서 read 호출 → `{version:1, items:{}}` 반환 + 해당 값으로 재저장, 예외 전파 없음
  - `localStorage['zss:badges:v1'] = 'null'` → `{version:1, items:{}}` 반환 + 재저장
  - `guard`가 false를 반환하는 값(예: `{"version":2}`) → fallback 반환 + fallback으로 덮어쓰기
  - `setItem`이 QuotaExceededError를 throw하도록 mock → `writeStore`가 `{ok:false, reason:'STORAGE_FULL'}` 반환, throw 0건
  - localStorage 자체가 접근 불가(getter가 throw)인 환경에서도 `readStore`가 fallback 반환, throw 0건
  - 소스 내 `console.error` 문자열 0건
- Covers: [F1-AC5(저장부), F1-AC6, F6-AC7(초기화부), CP-4]
- Files: `src/lib/storage.ts`
- Depends on: Task 1.1

### Task 2.2 스트릭 엔진 (순수 계산)
- Description: `src/lib/streak.ts`에 `computeStreak(items, today): StreakState`를 구현한다. 오늘 또는 어제까지 연속된 날짜만 `current`로 계산, `best`는 전체 최장 연속, `brokenAt`은 끊긴 첫 미체크인 날짜(연속 유지 시 null). 잘못된 DateKey는 무시.
- DoD:
  - items 키 `['2026-08-16','2026-08-17','2026-08-18']`, today `2026-08-19` → `{current:3, best:3, brokenAt:null}`
  - items 키 `['2026-08-15','2026-08-16']`, today `2026-08-19` → `{current:0, best:2, brokenAt:'2026-08-17'}`
  - items `{}` → `{current:0, best:0, lastCheckInDate:null, brokenAt:null}`
  - `'2026-13-45'` 포함 시 예외 없이 나머지로 계산
  - 미래 날짜 키가 섞여 있어도 `current` 계산에 포함되지 않음
  - 순수 함수 — localStorage 접근 0건, `Date` 직접 생성 0건(today는 인자로만 수신)
- Covers: [F1-AC2, F1-AC3, F4-AC6(부분)]
- Files: `src/lib/streak.ts`
- Depends on: Task 1.2

### Task 2.3 체크인 저장 + 뱃지 판정
- Description: `src/lib/checkins.ts`에 `loadCheckIns()`, `addCheckIn(memo, today = getTodayKey()): {ok:true;streak}|{ok:false;reason:'ALREADY_CHECKED'|'STORAGE_FULL'}`, `insertRecoveryCheckIn(date)`를 구현하고, `src/lib/badges.ts`에 `evaluateBadges(streak, items): BadgeId[]`(신규 해금분만 반환 + `seen:false`로 저장), `loadBadges()`, `markBadgeSeen(id)`를 구현한다.
- DoD:
  - 빈 스토어 + today `2026-08-19`에서 `addCheckIn('커피 참았다')` → items에 `{date:'2026-08-19',source:'manual',memo:'커피 참았다'}` 저장, 반환 `{ok:true, streak:{current:1,best:1,lastCheckInDate:'2026-08-19'}}`
  - 이미 오늘 기록 존재 시 `addCheckIn('또 체크')` → `{ok:false,reason:'ALREADY_CHECKED'}`, 기존 memo 불변
  - memo 31자 입력 시 저장값이 30자로 절단됨
  - write 실패 시 `{ok:false,reason:'STORAGE_FULL'}` + 메모리 상태 롤백(재조회 시 저장 전 값과 동일)
  - badges `{}` + `current:7` → `evaluateBadges` 반환 `['D3','D7']`(순서 고정), 스토어에 2건 `seen:false` 저장
  - 동일 조건 재호출 시 `[]` 반환, `unlockedAt` 불변
  - `insertRecoveryCheckIn('2026-08-18')` → `{source:'recovery', memo:''}` 삽입
  - TOTAL30(누적 30건), PERFECT_WEEK(월~일 7일 전부 체크인된 주 1회 이상) 판정 테스트 통과
  - `markBadgeSeen('D7')` 후 `loadBadges().items.D7.seen === true`
- Covers: [F1-AC1, F1-AC4, F1-AC5, F1-AC7, F6-AC4]
- Files: `src/lib/checkins.ts`, `src/lib/badges.ts`
- Depends on: Task 2.1, Task 2.2

### Task 2.4 복구권 상태 로직
- Description: `src/lib/recovery.ts`에 `loadRecovery()`, `refreshWeek(state, today)`(weekKey 변경 시 weeklyGrantCount=0), `canRecover(streak, recovery, today): {eligible:boolean; reason?:'NO_BROKEN'|'EXPIRED'|'WEEKLY_LIMIT'|'DAILY_LIMIT'}`, `applyRecovery(brokenAt, today)`(체크인 삽입 + weeklyGrantCount+1 + usedDates push)를 구현한다. 규칙: 끊긴 지 2일 이내, 하루 1회, 주 2회.
- DoD:
  - `weekKey:'2026-W33', weeklyGrantCount:2` + today `2026-08-19`(W34) → `refreshWeek` 결과 `weekKey:'2026-W34', weeklyGrantCount:0`으로 저장
  - `brokenAt:null` → `{eligible:false, reason:'NO_BROKEN'}`
  - `brokenAt:'2026-08-18'`, today `2026-08-19` → `canRecover.eligible === true`
  - `brokenAt:'2026-08-10'`, today `2026-08-19` → `{eligible:false, reason:'EXPIRED'}`
  - 같은 주 `weeklyGrantCount:2` → `{eligible:false, reason:'WEEKLY_LIMIT'}`
  - `grantedAtByDay[today] >= 1` → `{eligible:false, reason:'DAILY_LIMIT'}`
  - `applyRecovery('2026-08-18','2026-08-19')` 후 items에 `source:'recovery'` 존재, weeklyGrantCount 1 증가, `usedDates`에 `'2026-08-18'` 포함
  - 체크인 삽입이 STORAGE_FULL로 실패하면 카운터·usedDates 모두 증가하지 않음(원자성)
- Covers: [F5-AC4(판정부), F5-AC8, F5-AC3(판정부), F5-AC2(적용부)]
- Files: `src/lib/recovery.ts`
- Depends on: Task 2.3

### Task 2.5 통계 계산 로직
- Description: `src/lib/stats.ts`에 `getWeeklyRate(items, today)`, `getMonthlyRate(items, today)`, `getWeeklyTrend(items, today): number[]`(최근 8주 성공일수 0~7), `getWeekdayRates(items): number[]`(월~일 7개, 0~100)를 구현한다. 잘못된 DateKey는 무시.
- DoD:
  - today `2026-08-19`, 체크인 `08-14,08-16,08-17,08-19` → `getWeeklyRate` = `{rate:57, done:4, total:7}` (반올림)
  - today `2026-08-19`, 8월 중 10일 체크인 → `getMonthlyRate` = `{rate:53, done:10, total:19}` (분모=경과일수)
  - `getWeeklyTrend` 반환 길이 정확히 8, 각 값 0~7
  - `getWeekdayRates` 반환 길이 정확히 7, 각 값 0~100, 인덱스 0=월요일
  - items 0건 → 모든 rate 0, 예외 없음
  - `'2026-13-45'` 포함 시 무시하고 계산, throw 0건
  - 순수 함수 — localStorage 접근 0건
- Covers: [F4-AC2, F4-AC3, F4-AC4(계산부), F4-AC5(계산부), F4-AC6]
- Files: `src/lib/stats.ts`
- Depends on: Task 1.2

### Task 2.6 앱 스토어 (React Context)
- Description: `src/store/AppStore.tsx`에 `AppProvider` + `useApp()`을 구현한다. 노출: `status: 'loading'|'ready'`, `items`, `streak`, `badges`, `recovery`, `flags`, `checkIn(memo)`, `recover()`, `setBadgeSeen(id)`, `setOnboardingSeen()`, `pendingBadges: BadgeId[]`, `shiftPendingBadge()`. 마운트 시 모든 스토어 로드 → 캐시된 StreakState와 `computeStreak` 결과가 다르면 재계산 결과로 덮어쓴다. `flags`는 `zss:flags:v1`(`AppFlags`)에서 로드하며 없으면 `{version:1, onboardingSeen:false}`로 초기화한다.
- DoD:
  - 초기 렌더에서 `status === 'loading'`, 로드 완료 후 `'ready'`
  - `zss:streak:v1`에 조작된 `current:99` 저장 후 마운트 → 노출되는 `streak.current`가 재계산 값과 일치하고 스토어에도 재저장됨
  - `checkIn('메모')` 성공 시 items·streak가 즉시 갱신되고 신규 해금 뱃지가 `pendingBadges`에 순서대로 push됨
  - `checkIn`이 `{ok:false}`를 반환하면 items·streak 불변이고 reason이 호출자에게 그대로 전달됨
  - `shiftPendingBadge()`가 큐에서 1건씩 제거 (동시 노출 방지용)
  - `recover()`가 진행 중일 때 재호출하면 두 번째 호출은 즉시 무시됨(내부 in-flight 플래그)
  - `setOnboardingSeen()` 호출 후 `zss:flags:v1`이 `{version:1,onboardingSeen:true}`로 저장됨
  - Provider 외부에서 `useApp()` 호출 시 명확한 에러 throw
  - `npx tsc --noEmit` 통과
- Covers: [F1-AC8(상태부), F6-AC3(큐부), F6-AC5, F6-AC7(재판정부), F5-AC7(중복 요청 가드 상태), F8-AC2(플래그부)]
- Files: `src/store/AppStore.tsx`
- Depends on: Task 2.3, Task 2.4

---

## Epic 3. API Layer

**Risk Assessment**
- Complexity: Medium
- Risk factors: 네트워크 예외가 UI까지 전파되어 흰 화면; 하드코딩 도메인으로 검수 반려; 캐시 TTL 판정이 화면마다 갈림
- Mitigation: UI보다 먼저 API 계층을 완성하고, 모든 실패를 `{ok:false, error}` 유니온으로 정규화해 페이지는 분기만 담당

### Task 3.1 랭킹 API 클라이언트 + 그룹/캐시 저장소
- Description: `src/lib/rankingApi.ts`에 4개 엔드포인트 래퍼(`createGroup`, `joinGroup`, `syncStreak`, `fetchRanking`)를 구현한다. 모든 fetch는 `AbortController` 8초 타임아웃, 실패는 `{ok:false, error: 'GROUP_NOT_FOUND'|'INVALID_CODE_FORMAT'|'GROUP_FULL'|'NETWORK'|'TIMEOUT'|'UNKNOWN'}`로 반환(throw 금지, `console.error` 금지). `src/lib/friendGroup.ts`에 `FriendGroup`·`RankingCache` read/write, TTL 5분 판정(`isCacheFresh(cache, now)`), `checkLoginIntegrated()`(`getIsTossLoginIntegratedService()` 래퍼, 예외 시 false) 헬퍼를 둔다.
- DoD:
  - `fetchRanking`이 404 응답 시 `{ok:false, error:'GROUP_NOT_FOUND'}` 반환, throw 0건
  - fetch가 `TypeError('Failed to fetch')` 거부 시 `{ok:false, error:'NETWORK'}` 반환
  - 8초 경과 시 abort되어 `{ok:false, error:'TIMEOUT'}` 반환
  - 코드 형식 위반(`'abc'`, 7자) → 네트워크 호출 0회 + `{ok:false, error:'INVALID_CODE_FORMAT'}`
  - `syncStreak` 실패해도 반환값만 false이고 예외/다이얼로그 없음
  - `isCacheFresh({fetchedAt: now-299_000}, now) === true`, `now-301_000` → `false`
  - `getIsTossLoginIntegratedService`가 throw해도 `checkLoginIntegrated()`가 `false` 반환
  - base URL은 `import.meta.env.VITE_API_BASE_URL`만 참조 (하드코딩 도메인 0건), 미설정 시 모든 함수가 즉시 `{ok:false, error:'NETWORK'}` 반환
  - 소스 내 `console.error` 0건
- Covers: [F7-AC4(에러부), F7-AC5(캐시 판정부), F7-AC9, CP-2]
- Files: `src/lib/rankingApi.ts`, `src/lib/friendGroup.ts`
- Depends on: Task 1.1

---

## Epic 4. UI Components

**Risk Assessment**
- Complexity: Medium
- Risk factors: v1에서 HomePage가 RecoveryCard 스텁을 만들고 Task 3.2가 같은 파일을 완성 → **파일 2회 수정(소유권 위반)**; 페이지 1개에 기능 과다로 10분 초과
- Mitigation: 페이지가 조립할 하위 컴포넌트를 **페이지보다 먼저** 완성하고, 컴포넌트 파일은 각 태스크가 단독 소유한다. 페이지 태스크는 컴포넌트 파일을 수정하지 않는다

### Task 4.1 복구 카드 컴포넌트 + 리워드 광고 게이트
- Description: `src/components/RecoveryCard.tsx`를 처음부터 완성한다. `canRecover` 결과로 노출/비활성을 결정하고, `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 `recovery-cta`를 감싸 시청 완료 콜백에서만 `recover()`를 호출한다. 조건 미충족 시 컴포넌트가 `null`을 반환한다. props 없음(스토어 직접 구독).
- DoD:
  - `brokenAt='2026-08-18'`, today `2026-08-19` → `data-testid="recovery-card"` 렌더, 본문 `"8월 18일 하루가 비었어요. 광고 보고 스트릭을 살릴 수 있어요"`
  - 시청 완료 콜백 발생 시 `items['2026-08-18'].source==='recovery'`, weeklyGrantCount +1, Toast `"스트릭을 살렸어요!"`
  - `weeklyGrantCount===2` → `recovery-cta` `disabled`, 라벨 `"이번 주 복구 횟수를 다 썼어요 (2/2)"`
  - `brokenAt='2026-08-10'`, today `2026-08-19` → 컴포넌트가 `null` 반환하여 `recovery-card` 미렌더
  - `brokenAt=null` → `null` 반환
  - 완료 콜백 미발생(중도 이탈) → 체크인 미삽입, 카운터 불변, Toast `"광고를 끝까지 봐야 복구할 수 있어요"`
  - 로드 에러 → Toast `"지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요"` + 버튼 재활성화
  - 연타 3회 시 광고 요청 1회만 발생하고 버튼은 `loading` 상태
  - TDS 컴포넌트에 인라인 padding/margin 0건, 간격은 `Spacing size=...`만 사용
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7]
- Files: `src/components/RecoveryCard.tsx`
- Depends on: Task 2.6

### Task 4.2 체크인 메모 BottomSheet 컴포넌트
- Description: `src/components/CheckInSheet.tsx`를 구현한다. props: `{ open: boolean; onClose: () => void }`. TDS `BottomSheet` + `TextField`(maxLength 30, `enterKeyHint="done"`, Enter 제출) + `SubmitFooter` 내 확인 버튼. 제출 시 스토어 `checkIn(memo)` 호출 후 결과별 Toast를 띄우고, 성공 시에만 시트를 닫는다.
- DoD:
  - 31자 입력 시 값이 30자로 잘리고 헬퍼 텍스트 `"메모는 30자까지 입력할 수 있어요"` 표시
  - 빈 메모로 제출해도 체크인 성공(메모는 선택 항목)
  - 성공 시 Toast `"오늘도 0원! 5일 연속 성공"`(연속 일수는 갱신된 `streak.current` 사용) 후 `onClose()` 호출
  - `ALREADY_CHECKED` 반환 시 Toast `"오늘은 이미 체크인했어요"` + 시트 닫힘
  - `STORAGE_FULL` 반환 시 Toast `"저장 공간이 부족해요. 앱 데이터를 정리해주세요"` + **시트 열린 상태 유지**(입력값 보존)
  - Enter 키(`enterKeyHint="done"`)로 제출 가능, 제출 중 버튼 `loading` + 중복 제출 0건
  - 키보드 노출 시 BottomSheet 상승, 터치 타깃 ≥44x44px
  - TDS 컴포넌트에 인라인 padding/margin 0건
- Covers: [F1-AC1(입력부), F1-AC4, F1-AC5(UI부), F1-AC6, F2-AC5]
- Files: `src/components/CheckInSheet.tsx`
- Depends on: Task 2.6

### Task 4.3 그룹 생성/참여 컴포넌트
- Description: `src/components/GroupOnboarding.tsx`(그룹 미참여 빈 상태 + `SubmitFooter` 버튼 2개)와 `src/components/GroupSheets.tsx`(그룹 만들기 / 코드로 참여 BottomSheet)를 구현한다. 닉네임 maxLength 10, 코드 maxLength 6 + `autoCapitalize="characters"` + `inputMode="text"`. `checkLoginIntegrated()`가 false면 잠금 상태를 표시한다. `props: { openJoinSheetOnMount?: boolean; onJoined: () => void }`로 페이지와 통신하며 **페이지 파일은 건드리지 않는다.**
- DoD:
  - `groupCode===null` 렌더 → `Asset.ContentIcon` + `"친구와 함께 겨뤄보세요"` + `SubmitFooter` 내 `Button display="block"` 2개("그룹 만들기"/"코드로 참여")
  - 닉네임 `"짠순이"` + `data-testid="create-group"` 탭, 서버 `{groupCode:'A7K2QX',memberId:'uuid-1'}` → `zss:friendGroup:v1`에 3필드 저장 후 `onJoined()` 호출
  - 코드 `"ZZZZZZ"` 참여 시 404 → TextField 하단 `"존재하지 않는 코드예요"`, localStorage 불변
  - 코드 5자 입력 상태에서 제출 버튼 `disabled`
  - 정원 초과(`GROUP_FULL`) → `"이 그룹은 정원이 가득 찼어요"`, 네트워크 오류(`NETWORK`/`TIMEOUT`) → `"연결이 불안정해요. 다시 시도해주세요"`
  - 로그인 미연동(`checkLoginIntegrated()===false`) 시 버튼 잠금 표시 + `"토스 로그인 연동 후 이용할 수 있어요"`, 예외 없음
  - `openJoinSheetOnMount === true`일 때만 참여 시트 자동 오픈, `undefined`여도 크래시 없음
  - 키보드 노출 시 BottomSheet 상승, 터치 타깃 ≥44x44px
  - 변경 파일이 `src/components/` 2개뿐 (`src/pages/RankingPage.tsx` 미포함)
- Covers: [F7-AC1, F7-AC4, F7-AC7, CP-2]
- Files: `src/components/GroupOnboarding.tsx`, `src/components/GroupSheets.tsx`
- Depends on: Task 3.1, Task 2.6

### Task 4.4 뱃지 해금 다이얼로그 (전역 마운트용)
- Description: `src/components/BadgeUnlockDialog.tsx`를 구현한다. 스토어의 `pendingBadges` 큐를 1건씩 순차 `AlertDialog`로 노출하고, "확인" 시 `setBadgeSeen(id)` + `shiftPendingBadge()`, "컬렉션 보기" 시 `navigate('/badges', { state: { highlightBadgeId } })`. props 없이 `App.tsx`에서 전역 마운트 가능하도록 self-contained.
- DoD:
  - `pendingBadges === ['D7']` → AlertDialog 제목 `"일주일 완주 뱃지 획득!"`, "확인" 탭 시 `badges.items.D7.seen===true` 저장 후 닫힘
  - `['D3','D7']` → D3 → 확인 → D7 순차 노출, 동시 표시 0건(DOM 내 dialog 1개)
  - `seen===true`인 뱃지는 큐에 다시 들어가지 않아 재체크인 시 다이얼로그 미노출, `unlockedAt` 불변
  - "컬렉션 보기" 탭 → `navigate('/badges', { state: { highlightBadgeId: 'D7' } })` 호출(RouteState `"/badges"` 타입 일치) + 큐도 소비됨
  - `pendingBadges === []` → 렌더 결과 `null`, DOM 노드 0개
  - 버튼 터치 타깃 ≥44x44px, TDS 인라인 padding/margin 0건
- Covers: [F6-AC3, F6-AC5, F6-AC8]
- Files: `src/components/BadgeUnlockDialog.tsx`
- Depends on: Task 2.6

---

## Epic 5. UI Pages

**Risk Assessment**
- Complexity: High
- Risk factors: TDS 여백을 인라인 스타일로 덮어써 검수 반려; `location.state` 없이 직접 진입 시 크래시(2026-08-03 SplitMate 사고); 페이지에 기능 과다
- Mitigation: 데이터·API·컴포넌트 계층을 전부 선행 완료해 페이지는 **조립만** 담당. 페이지 파일은 정확히 한 태스크만 소유. 모든 state 수신 화면에 null-guard AC 명시

### Task 5.1 홈 화면 — `/`
- Description: `src/pages/HomePage.tsx`를 `ScreenScaffold` + `Top`으로 구성한다. `SummaryHero`(streak-hero, CountUp, suffix "일 연속"), 히어로 바로 아래 `<RecoveryCard />`(Task 4.1 완성본, 수정 금지), `streak-card` Card(최고 기록·누적), `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, `last7-dots`, `SubmitFooter` 내 `checkin-cta` Button(display="block"), `<CheckInSheet />`(Task 4.2 완성본) 오픈 제어.
- DoD:
  - `data-testid="streak-hero"`, `"streak-card"`, `"last7-dots"`, `"checkin-cta"` 존재
  - DOM 순서: streak-hero → RecoveryCard → streak-card → AdSlot → last7-dots, 홈 내 AdSlot 정확히 1개이며 `SubmitFooter`와 겹침 0(최하단 스크롤에서도 CTA 가림 없음)
  - `checkin-cta` 탭 → `CheckInSheet`의 `open` prop이 true로 전달됨; 체크인 성공 후 히어로 값이 CountUp으로 갱신
  - 오늘 기록 존재 시 CTA `disabled` + 라벨 `"오늘 체크인 완료"` + `data-testid="checkin-done-badge"` Chip `"오늘 완료"`
  - `last7-dots`가 최근 7일 점 7개를 렌더하며 manual/recovery/miss 상태가 구분됨
  - 0건일 때 히어로 `0` + `Asset.ContentIcon` + `"첫 무지출 데이를 기록해보세요"`
  - `status==='loading'` 중 Skeleton 렌더 + CTA `disabled`
  - `location.state`는 `(useLocation().state as RouteState["/"]) ?? null`로 읽고 null이어도 정상 렌더; `justJoinedGroup===true`면 Toast `"그룹에 참여했어요!"` 1회만 표시
  - TDS 컴포넌트에 인라인 padding/margin 0건, 간격은 `Spacing size=...`만 사용
  - `git diff --name-only`에 `src/components/RecoveryCard.tsx`, `src/components/CheckInSheet.tsx` 미포함
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7, F2-AC8, F1-AC8]
- Files: `src/pages/HomePage.tsx`
- Depends on: Task 4.1, Task 4.2

### Task 5.2 캘린더 화면 — `/streak`
- Description: `src/pages/StreakPage.tsx` — `ScreenScaffold` + 커스텀 flex 헤더(prev/월/next) + 커스텀 CSS grid 7열 `calendar-grid`. 각 셀 `cell-{DateKey}`에 `data-state` 부여. 셀 탭 시 날짜 상세 BottomSheet, `month-summary-card` Card.
- DoD:
  - 2026년 8월에서 `cell-2026-08-01`~`cell-2026-08-31` 총 31개 렌더
  - `data-state`가 manual→`success`, recovery→`recovery`, 과거 미체크인→`miss`, 오늘 이후→`future`
  - `calendar-prev` 탭 → 헤더 `"2026년 7월"` + 31셀 렌더
  - memo 있는 `cell-2026-08-18` 탭 → BottomSheet에 `"2026년 8월 18일"`, `"편의점 참기"` 표시
  - `cell-2026-08-25`(미래) 탭 → BottomSheet 미오픈, 상태 변화 0
  - 이번 달일 때 `calendar-next` `disabled`
  - 해당 월 0건 → `Asset.ContentIcon` + `"이 달에는 기록이 없어요"`
  - `month-summary-card`에 해당 월 성공 일수/달성률 표시
  - 셀 터치 타깃 ≥44x44px, 셀 텍스트는 `Paragraph.Text`, TDS 인라인 padding/margin 0건
  - incoming state는 `(useLocation().state as RouteState["/streak"]) ?? null`로 읽고 null이면 이번 달 표시; `focusMonth:'2026-07'`이면 7월로 진입 — 직접 진입/새로고침 시 크래시 없음
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- Files: `src/pages/StreakPage.tsx`
- Depends on: Task 2.6

### Task 5.3 통계 화면 — `/stats`
- Description: `src/pages/StatsPage.tsx` — `ScreenScaffold` 안에 `stat-weekly-card` / `stat-monthly-card` Card 2개(달성률 t2 강조 + 보조 텍스트), `weekly-trend-sparkline`, `weekday-minibar`, 월간 카드와 MiniBar 사이 `<AdSlot />` 1개. 계산은 `useMemo` 1회.
- DoD:
  - `weekly-rate` `"57%"` + 보조 `"7일 중 4일"`, `monthly-rate` `"53%"` + 보조 `"19일 중 10일"` (SPEC 시나리오 데이터 기준)
  - Sparkline 포인트 정확히 8개, MiniBar 바 정확히 7개(월~일 라벨)
  - 체크인 0건 → 차트 대신 `Asset.ContentIcon` + `"기록이 쌓이면 통계를 보여드려요"`, `weekly-rate`는 `"0%"`
  - 잘못된 DateKey 포함 시 화면 정상 렌더(흰 화면 0)
  - 계산 완료 전 각 Card 자리 `Skeleton`, 리렌더 시 계산 함수 재호출 0회(useMemo 의존성 items/today만)
  - `<AdSlot />`이 monthly-card와 minibar 사이 DOM 순서에 정확히 1개, 차트와 겹침 없음
  - 차트는 커스텀 CSS(flex/grid)+SVG로만 구성, 외부 차트 라이브러리 의존성 0건
  - TDS 인라인 padding/margin 0건
- Covers: [F4-AC1, F4-AC4, F4-AC5, F4-AC7, F4-AC8]
- Files: `src/pages/StatsPage.tsx`
- Depends on: Task 2.5, Task 2.6

### Task 5.4 랭킹 화면 — `/ranking`
- Description: `src/pages/RankingPage.tsx`를 생성한다. `groupCode === null`이면 Task 4.3의 `<GroupOnboarding />`을 렌더하고(참여 성공 시 `navigate('/', { state: { justJoinedGroup: true } })`), 참여 상태에서는 `my-rank-card` Card + `SummaryHero`(CountUp 내 등수), `ranking-list`의 `ListRow` 반복(내 행에 `ranking-me` + `Chip("나")`), 20개 렌더 후 "더 보기", `copy-code` 클립보드 복사, 로딩 Skeleton 3행, 오프라인 캐시 폴백, 진입 시 `syncStreak` 호출을 구현한다. **이 파일은 본 태스크만 소유한다.**
- DoD:
  - `groupCode===null` → `GroupOnboarding` 렌더, 참여 성공 시 `navigate('/', { state: { justJoinedGroup: true } })` (RouteState `"/"` 타입 일치)
  - 그룹 생성 직후 리스트에 본인 1행(`rank:1`, `isMe:true`) 표시
  - entries 2건 응답 → `ranking-list` 안에 `ListRow` 2개가 rank 순서대로, `isMe` 행에 `data-testid="ranking-me"`
  - `my-rank-card`가 리스트 상단, `SummaryHero`가 `"2위"` CountUp
  - fetch 실패 + 5분 내 캐시 2건 → 캐시 렌더 + `"오프라인 상태예요. 마지막 순위를 보여드려요"`, 크래시 0
  - fetch 실패 + 캐시 없음/만료 → `Asset.ContentIcon` + `"순위를 불러오지 못했어요"` + 재시도 버튼, 크래시 0
  - 요청 중 `Skeleton` ListRow 3개 + 새로고침 버튼 `disabled`
  - `copy-code` 탭 → 클립보드에 코드 복사 + Toast `"코드를 복사했어요"`, `window.open`/`window.location.href` 호출 0건
  - 그룹원 1명 → 본인 행 + `"친구를 초대해 코드를 공유해보세요"`
  - entries 50건 → 초기 20행 렌더, "더 보기" 1회 탭 시 40행
  - 진입 시 `syncStreak` 호출, 실패해도 에러 다이얼로그 0건·로컬 데이터 불변
  - incoming state는 `(useLocation().state as RouteState["/ranking"]) ?? null`; `openJoinSheet`가 true일 때만 `openJoinSheetOnMount` prop으로 전달, state 없이 직접 진입/새로고침해도 크래시 없음
  - `git diff --name-only`에 `src/components/GroupOnboarding.tsx`, `GroupSheets.tsx` 미포함
- Covers: [F7-AC1, F7-AC2, F7-AC3, F7-AC5, F7-AC6, F7-AC8, F7-AC9, CP-5(페이지네이션)]
- Files: `src/pages/RankingPage.tsx`
- Depends on: Task 4.3

### Task 5.5 뱃지 컬렉션 화면 — `/badges`
- Description: `src/pages/BadgesPage.tsx`를 구현한다. 2열 커스텀 CSS grid로 8개 Card(`badge-{BadgeId}`)를 항상 렌더하고 `data-unlocked` 부여, 상단에 진행 요약 Card. `highlightBadgeId` state가 있으면 해당 카드를 강조하고 스크롤 이동한다. 해금 다이얼로그는 Task 4.4가 전역 마운트하므로 **이 페이지에서 렌더하지 않는다.**
- DoD:
  - `badge-grid` 안에 `badge-D3`…`badge-PERFECT_WEEK` 8개 항상 렌더
  - 각 카드 `data-unlocked`가 `"true"`/`"false"`, 미해금은 opacity 축소 + `BADGE_TABLE`의 조건 텍스트(예: `"3일 연속 달성 시 획득"`) 표시
  - 상단 요약 Card에 `"8개 중 3개 획득"` 형식 표시
  - 해금 0개 → `Asset.ContentIcon` + `"아직 획득한 뱃지가 없어요. 3일 연속이면 첫 뱃지!"`, 8칸 모두 `data-unlocked="false"`
  - `zss:badges:v1==='null'` 상태 진입 → 재초기화·재판정 후 정상 렌더, `console.error` 0회
  - 카드 최소 높이 96px, 뒤로가기 터치 타깃 44x44px
  - incoming state는 `(useLocation().state as RouteState["/badges"]) ?? null` — null이면 강조 없이 정상 렌더, `highlightBadgeId:'D7'`이면 `badge-D7`에 `data-highlight="true"`
  - `git diff --name-only`에 `src/components/BadgeUnlockDialog.tsx` 미포함
- Covers: [F6-AC1, F6-AC2, F6-AC6, F6-AC7]
- Files: `src/pages/BadgesPage.tsx`
- Depends on: Task 2.6

---

## Epic 6. Integration + Compliance

**Risk Assessment**
- Complexity: Medium
- Risk factors: 라우팅 미연결로 페이지 고립, 알 수 없는 경로 진입 시 빈 화면, HEX 하드코딩·외부 이탈 코드가 검수 반려 유발
- Mitigation: 페이지·컴포넌트 파일은 Epic 4~5에서 확정되었으므로 Epic 6은 `App.tsx`·신규 파일·설정 파일만 다뤄 충돌이 없다. 컴플라이언스 스캔은 최종 게이트

### Task 6.1 라우팅 배선 + 온보딩 + 탭 네비게이션
- Description: `src/App.tsx`에 `BrowserRouter` + `AppProvider` + 5개 Route(`/`, `/streak`, `/stats`, `/ranking`, `/badges`) + `<Route path="*" element={<Navigate to="/" replace />} />`를 구성하고, 전역 `<BadgeUnlockDialog />`와 `<ErrorBoundary>`를 마운트한다. `FloatingTabBar`에 4개 탭을 연결하고, `src/components/OnboardingSheet.tsx`로 최초 1회 BottomSheet를 노출한다.
- DoD:
  - 5개 경로 모두 정상 렌더, `/unknown` 진입 시 `/`로 리다이렉트되고 홈 탭 `data-active="true"`
  - `FloatingTabBar` 4개 탭(`/`,`/streak`,`/stats`,`/ranking`)이 `location.pathname` 일치 시 `data-active="true"`, 각 탭 터치 타깃 ≥44x44px
  - `zss:flags:v1` 없음 또는 `onboardingSeen:false` → BottomSheet 열림, 3단계 안내 + `"매일 0원 지출에 성공하면 체크인하세요"` 표시
  - "시작하기" 탭 → `setOnboardingSeen()` 호출로 `{version:1,onboardingSeen:true}` 저장, 재진입 시 미노출
  - `<BadgeUnlockDialog />`가 라우트 바깥에 정확히 1개 마운트되어 어느 경로에서 해금돼도 노출됨
  - 하위 렌더 에러 발생 시 `ErrorBoundary`가 폴백 UI(`"문제가 발생했어요. 다시 시도해주세요"` + 재시도 버튼)를 렌더하고 흰 화면 0
  - 홈 `streak-card` 탭 → `/streak`로 `{focusMonth:'2026-08'}` state 전달이 실제 동작(RouteState 타입 일치)
  - 5개 경로 각각 새로고침(state 없음) 시 크래시 0건
  - 변경 파일이 `src/App.tsx`, `src/components/OnboardingSheet.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/FloatingTabBar.tsx`(탭 정의만)뿐 — 페이지 파일 미수정
- Covers: [F8-AC1, F8-AC2, F8-AC9, F6-AC3(전역 마운트), S1/S2/S5 Navigation state contract]
- Files: `src/App.tsx`, `src/components/OnboardingSheet.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/FloatingTabBar.tsx`
- Depends on: Task 5.1, Task 5.2, Task 5.3, Task 5.4, Task 5.5, Task 4.4

### Task 6.2 프로모션 지급 가드 래퍼
- Description: `src/lib/promotion.ts`에 `grantRewardSafe(amount: number)` 래퍼를 추가한다. `amount > 5000`이면 `grantPromotionReward`를 호출하지 않고 `{ok:false, error:'AMOUNT_EXCEEDS_LIMIT'}`를 반환하며, MVP에서는 어떤 화면도 이 함수를 호출하지 않는다.
- DoD:
  - `grantRewardSafe(5001)` → `grantPromotionReward` 호출 0회, 반환 `{ok:false, error:'AMOUNT_EXCEEDS_LIMIT'}`
  - `grantRewardSafe(5000)` → 한도 통과 경로 진입(mock 호출 1회 확인)
  - `grantPromotionReward`가 reject해도 `{ok:false, error:'GRANT_FAILED'}` 반환, throw 0건
  - `grep -rn "grantPromotionReward" src/` 결과가 `src/lib/promotion.ts` 1개 파일에만 존재
  - 신규 파일 1개만 추가, 기존 페이지/컴포넌트 파일 수정 0건
- Covers: [F8-AC8]
- Files: `src/lib/promotion.ts`
- Depends on: Task 6.1

### Task 6.3 검수 컴플라이언스 최종 점검
- Description: 전 코드베이스를 스캔해 정책 위반을 제거하고 빌드 설정을 확인한다. HEX 색상 → `var(--tds-color-*)` 치환, 외부 이탈 호출·설치 유도 문구 제거, 외부 분석 패키지 제거, `vite.config.ts` build target `es2019` 설정, 금지 API 사용 제거.
- DoD:
  - `grep -rE "#[0-9a-fA-F]{3,6}\b" src/` 결과 0건 (색상 리터럴 기준)
  - `grep -rE "window\.open\(|window\.location\.href\s*=" src/` 0건
  - `grep -rE "앱을 설치|다운로드|스토어에서 받기" src/` 0건
  - `package.json` + `index.html`에 gtag/google-analytics/amplitude/mixpanel/sentry 0건
  - `grep -rE "\.at\(|Object\.groupBy|findLast|structuredClone" src/` 0건
  - `grep -rn "console.error" src/` 0건
  - `grep -rE "useTossAd|loadAdMob|showAdMob" src/` 0건
  - `vite.config.ts`의 `build.target === 'es2019'`
  - `npm run test` 전체 통과, `npm run build` 성공
  - 프리뷰에서 홈→캘린더→통계→랭킹→뱃지 순회 시 `console.error` 호출 0회, 다크모드 전환 시 가독 불가 요소 0건
  - TDS 외 UI 라이브러리(shadcn/MUI/antd/chakra) 의존성 0건
- Covers: [F8-AC3, F8-AC4, F8-AC5, F8-AC6, F8-AC7, CP-1, CP-7]
- Files: `src/**/*`(위반 라인 치환 한정), `vite.config.ts`, `package.json`
- Depends on: Task 6.2

---

## Task Ordering 검증 (Data → API → UI)

| 계층 | Epic | 태스크 |
|---|---|---|
| Setup | 0 | 0.1 |
| Types | 1 | 1.1, 1.2 |
| Data | 2 | 2.1 → 2.2 → 2.3 → 2.4 / 2.5 → 2.6 |
| **API** | 3 | 3.1 |
| UI 컴포넌트 | 4 | 4.1, 4.2, 4.3, 4.4 |
| UI 페이지 | 5 | 5.1, 5.2, 5.3, 5.4, 5.5 |
| Integration | 6 | 6.1 → 6.2 → 6.3 |

→ 모든 UI 태스크의 의존성이 Data/API 계층 태스크로만 향한다(역방향 의존 0건).

## File Ownership Map (충돌 검증)

| 파일 | 소유 태스크 |
|---|---|
| `.env.example`, `vitest.config.ts`, `src/test/setup.ts`, `src/vite-env.d.ts` | 0.1 |
| `src/lib/types.ts` | 1.1 |
| `src/lib/date.ts` | 1.2 |
| `src/lib/storage.ts` | 2.1 |
| `src/lib/streak.ts` | 2.2 |
| `src/lib/checkins.ts`, `src/lib/badges.ts` | 2.3 |
| `src/lib/recovery.ts` | 2.4 |
| `src/lib/stats.ts` | 2.5 |
| `src/store/AppStore.tsx` | 2.6 |
| `src/lib/rankingApi.ts`, `src/lib/friendGroup.ts` | 3.1 |
| `src/components/RecoveryCard.tsx` | 4.1 |
| `src/components/CheckInSheet.tsx` | 4.2 |
| `src/components/GroupOnboarding.tsx`, `GroupSheets.tsx` | 4.3 |
| `src/components/BadgeUnlockDialog.tsx` | 4.4 |
| `src/pages/HomePage.tsx` | 5.1 |
| `src/pages/StreakPage.tsx` | 5.2 |
| `src/pages/StatsPage.tsx` | 5.3 |
| `src/pages/RankingPage.tsx` | 5.4 |
| `src/pages/BadgesPage.tsx` | 5.5 |
| `src/App.tsx`, `OnboardingSheet.tsx`, `ErrorBoundary.tsx`, `FloatingTabBar.tsx` | 6.1 |
| `src/lib/promotion.ts` | 6.2 |
| `vite.config.ts`, `package.json`(빌드 설정) | 6.3 |

→ 동일 파일을 2개 이상 태스크가 **수정**하는 케이스 0건. (v1의 `RecoveryCard.tsx` 스텁 2회 수정 문제 해소. `package.json`은 0.1이 생성/의존성 추가, 6.3은 `build.target` 검증 및 위반 의존성 제거만 수행하므로 섹션이 겹치지 않음.)

## Data Model → 소비 태스크 매핑 (SPEC 커버리지)

| 모델 | 정의 | 읽기/쓰기 | 화면 소비 |
|---|---|---|---|
| CheckIn / CheckInStore | 1.1 | 2.3 | 5.1, 5.2, 5.3 |
| StreakState | 1.1 | 2.2, 2.6 | 5.1, 5.4 |
| RecoveryState | 1.1 | 2.4 | 4.1 |
| BadgeId / BadgeRecord / BadgeStore | 1.1 | 2.3 | 4.4, 5.5 |
| FriendGroup | 1.1 | 3.1 | 4.3, 5.4 |
| RankingEntry / RankingCache | 1.1 | 3.1 | 5.4 |
| AppFlags | 1.1 | 2.6 | 6.1 |
| RouteState | 1.1 | — | 5.1, 5.2, 5.4, 5.5, 6.1 |

→ 미소비 모델 0건, 미정의 소비 0건.

## AC Coverage

- **Total ACs in SPEC: 66** (F1:8, F2:8, F3:8, F4:8, F5:8, F6:8, F7:9, F8:9)
- **Covered by tasks: 66 / Uncovered: 0**

| Feature | AC | Task |
|---|---|---|
| F1 | AC1 | 2.3, 4.2 |
| F1 | AC2, AC3 | 2.2 |
| F1 | AC4, AC5 | 2.3, 4.2 |
| F1 | AC6 | 2.1, 4.2 |
| F1 | AC7 | 1.1, 2.3 |
| F1 | AC8 | 2.6, 5.1 |
| F2 | AC1~AC8 | 5.1 (AC5는 4.2 병행) |
| F3 | AC1~AC8 | 5.2 |
| F4 | AC2, AC3, AC6 | 2.5 |
| F4 | AC1, AC4, AC5, AC7, AC8 | 5.3 |
| F5 | AC3, AC4, AC8 | 2.4 |
| F5 | AC1~AC7 | 4.1 |
| F6 | AC4 | 2.3 |
| F6 | AC1, AC2, AC6, AC7 | 1.1, 2.6, 5.5 |
| F6 | AC3, AC5, AC8 | 4.4, 6.1 |
| F7 | AC4, AC5, AC9 | 3.1 |
| F7 | AC1, AC4, AC7 | 4.3 |
| F7 | AC1, AC2, AC3, AC5, AC6, AC8, AC9 | 5.4 |
| F8 | AC1, AC2, AC9 | 6.1 |
| F8 | AC8 | 6.2 |
| F8 | AC3, AC4, AC5, AC6, AC7 | 6.3 |
| CP-1 | — | 0.1, 6.3 (+ 전 UI 태스크 DoD의 "인라인 padding/margin 0건") |
| CP-2 | — | 3.1, 4.3 |
| CP-3 | — | 1.2 |
| CP-4 | — | 1.1, 2.1 |
| CP-5 | — | 4.2, 4.3, 5.2, 5.4, 5.5, 6.1 |
| CP-6 | — | 0.1, 4.1, 5.1, 5.3 |
| CP-7 | — | 6.3 |

**추가 안전 커버리지 (실사고 방지)**: state 수신 화면 4곳(5.1 홈, 5.2 캘린더, 5.4 랭킹, 5.5 뱃지) 전부에 "state 없이 직접 진입/새로고침해도 크래시하지 않는다" DoD가 포함되었고, Task 6.1에서 5개 경로 전체를 새로고침 검증 + `ErrorBoundary`로 최종 방어한다.

---

## Changelog (v1 → v2)

1. **[신규] Epic 0 / Task 0.1** — v1의 다수 DoD가 "mock 호출 확인", "테스트 통과"를 요구했으나 테스트 러너·env 키 계약이 어디에도 없었음. env 4개 키와 vitest 하네스를 선행 고정.
2. **[구조] API 계층 분리** — v1 Task 2.7(랭킹 API)이 Data Layer에 섞여 있어 "Data → API → UI" 순서가 문서상 드러나지 않았음. Epic 3(API Layer)으로 승격하고 계층 검증표 추가.
3. **[치명] 파일 소유권 위반 제거** — v1 Task 3.1이 `RecoveryCard.tsx` 스텁을 생성하고 3.2가 같은 파일을 완성 → 2회 수정. Epic 4(UI 컴포넌트)를 페이지보다 앞에 두어 RecoveryCard를 4.1이 단독 완성하고, HomePage(5.1)는 조립만 하도록 반전.
4. **[분할] HomePage 과밀 해소** — 히어로+카드+광고+7일 점+체크인 시트+Toast가 한 패킷에 몰려 10분 초과 위험. 메모 BottomSheet를 `CheckInSheet.tsx`(Task 4.2)로 분리.
5. **[분할] 뱃지 화면 분리** — v1 Task 3.7이 페이지 + 전역 다이얼로그 2개 파일을 동시 소유. `BadgeUnlockDialog`(4.4, 전역 마운트용)와 `BadgesPage`(5.5)로 분리.
6. **[보강] 미정의 데이터 모델 명시** — `FriendGroup`, `RankingEntry`, `RankingCache`, `AppFlags`의 필드를 Task 1.1 DoD에 코드로 고정하고, `STORAGE_KEYS` 7개를 실제 키 문자열로 열거. 모델→소비 태스크 매핑표 추가.
7. **[보강] Task 2.1 DoD 완성** — guard 실패 케이스, localStorage 접근 자체가 throw하는 환경 케이스 추가.
8. **[보강] 흰 화면 방어** — Task 6.1에 `ErrorBoundary` 마운트 및 폴백 UI DoD 추가.
9. **[문서] PRD ↔ SPEC 스택 차이 해소** — TypeScript/React Router/localStorage를 "구현 수단"으로 명시한 정합성 메모 추가. PRD 목표는 변경하지 않음.
10. **[보강] CP 커버리지 표 추가** — v1은 Feature AC만 추적하고 CP-1~7 검증 위치가 불명확했음.