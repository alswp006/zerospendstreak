# SPEC — ZeroSpendStreak

> 하루 지출 0원 챌린지 · 스트릭 · 랭킹 · 뱃지
> Platform: 앱인토스 (Vite + React + TypeScript + TDS + React Router + localStorage)

---

## Common Principles

### P1. 기술 스택 고정
- UI는 **TDS(@toss/tds-mobile)** 컴포넌트만 사용: `ListRow`, `Button`, `TextField`, `Paragraph.Text`, `Chip`, `Switch`, `AlertDialog`, `BottomSheet`, `Toast`, `Top`, `Tab`, `Spacing`, `Card`, `Asset.ContentIcon`.
- shadcn/ui, MUI, Ant Design, Chakra UI 사용 금지.
- 하단 네비게이션은 TDS에 없으므로 **템플릿 제공 `src/components/FloatingTabBar`** 사용. `Tab`은 상단 콘텐츠 전환 전용.
- 라우팅: `react-router-dom` (BrowserRouter, 6.x).
- 상태: React `useState`/`useReducer` + 커스텀 훅. 전역 상태 라이브러리 없음.

### P2. 스타일 규칙
- TDS 컴포넌트에 Tailwind/인라인 스타일로 padding·margin 덮어쓰기 **금지**.
- 간격은 `<Spacing size={N} />`만 사용 (size prop 필수).
- 커스텀 CSS는 TDS가 제공하지 않는 flex/grid 레이아웃(캘린더 7열 그리드, 뱃지 3열 그리드)에만 허용.
- 색상은 `var(--tds-color-*)` CSS 변수만 사용. HEX 하드코딩 금지(다크모드 필수).

### P3. 페이지 골격 계약
- 모든 화면은 템플릿 제공 `ScreenScaffold`로 감싼다. raw `<div>` 골격 금지.
- 1차 액션 버튼은 `SubmitFooter`(하단 고정) 또는 `display="block"` 버튼. 좌측 글자폭 버튼 금지.
- 결과/지표/비교 정보는 `Card`로 묶어 위계 표현. 맨 `div` 나열 금지.
- 모든 터치 타깃 최소 44×44px.

### P4. 날짜 기준
- 모든 날짜는 **KST(UTC+9)** 기준 `YYYY-MM-DD` 문자열.
- 유틸: `todayKST(): string`, `addDays(dateStr, n): string`, `diffDays(a, b): number`.
- 기기 시간대가 KST가 아니어도 KST로 강제 변환하여 계산한다.

### P5. 데이터 영속성
- 모든 데이터는 `localStorage`. 서버 사이드 코드 없음.
- 랭킹 기능만 외부 API 서버(별도 Railway 배포) 호출. 실패 시 **로컬 전용 모드**로 graceful degradation.
- 저장 실패(QuotaExceededError) 시 사용자에게 Toast로 고지하고 상태를 롤백한다.

### P6. 인증
- 토스 앱이 세션을 자동 제공. 별도 로그인 함수 호출 없음.
- 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 여부만 확인.
- 랭킹용 식별자는 앱 최초 실행 시 생성한 `deviceUserId`(UUID v4, localStorage 보관)를 사용.

### P7. 수익화
- 배너: `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`
- 리워드: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`
- 광고는 콘텐츠를 가리지 않는 위치(섹션 사이 / 결과 하단)에만 배치.
- IAP 없음(PRD Monetization = ads).

### P8. 생성형 AI
- 본 앱은 생성형 AI 결과물을 생성/노출하지 **않는다**. 따라서 AI 사전 고지 및 결과물 라벨 요건은 **N/A**.
- (Open Question OQ-4 참조: 향후 "절약 코멘트 자동 생성" 도입 시 고지 의무 발생)

---

## Data Models

### Entity: CheckIn
하루 무지출 성공 기록 1건.

```ts
export type CheckInSource = 'manual' | 'recovery';

export interface CheckIn {
  /** KST 기준 'YYYY-MM-DD' — 고유 키 */
  date: string;
  /** 체크인 저장 시각 (epoch ms) */
  createdAt: number;
  /** 'manual' = 사용자가 직접 체크인, 'recovery' = 복구권으로 메꾼 날 */
  source: CheckInSource;
  /** 선택 메모, 최대 50자 */
  memo?: string;
}
```

제약:
- `date`는 `/^\d{4}-\d{2}-\d{2}$/` 만족, 미래 날짜 금지(`date <= todayKST()`).
- `memo` 길이 0~50자. 51자 이상 입력 차단.
- 동일 `date` 중복 저장 금지(upsert 아님, 거부).

---

### Entity: StreakState
현재 스트릭 계산 결과 캐시.

```ts
export interface StreakState {
  /** 현재 연속 성공일수 */
  current: number;
  /** 역대 최고 연속 성공일수 */
  best: number;
  /** 마지막 체크인 날짜 'YYYY-MM-DD' | null */
  lastCheckInDate: string | null;
  /** 총 무지출 일수 (recovery 포함) */
  totalDays: number;
}
```

제약:
- `current`, `best`, `totalDays`는 0 이상 정수.
- `StreakState`는 **파생 데이터**. `CheckIn[]`로부터 항상 재계산 가능해야 하며, 캐시 불일치 시 재계산 값이 우선한다.

---

### Entity: RecoveryTicket
스트릭 복구권.

```ts
export interface RecoveryWallet {
  /** 보유 복구권 수, 0~3 */
  tickets: number;
  /** 오늘(KST) 광고로 획득한 복구권 수, 일일 상한 1 */
  earnedToday: number;
  /** earnedToday 기준 날짜 'YYYY-MM-DD' */
  earnedTodayDate: string;
  /** 복구권 사용 이력 */
  usages: RecoveryUsage[];
}

export interface RecoveryUsage {
  /** 복구한 대상 날짜 'YYYY-MM-DD' */
  recoveredDate: string;
  /** 사용 시각 epoch ms */
  usedAt: number;
}
```

제약:
- `tickets` 최대 3. 초과 획득 시도 거부.
- `earnedToday` 최대 1. 하루 1회만 광고로 획득.
- 복구 가능 대상은 **최근 7일 이내의 미체크인 날짜**로 한정.

---

### Entity: Badge

```ts
export type BadgeId =
  | 'first_step'   // 총 1일
  | 'streak_3'     // 연속 3일
  | 'streak_7'     // 연속 7일
  | 'streak_14'    // 연속 14일
  | 'streak_30'    // 연속 30일
  | 'streak_60'    // 연속 60일
  | 'streak_100'   // 연속 100일
  | 'total_50'     // 누적 50일
  | 'comeback';    // 복구권 최초 사용

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  /** 'streak' | 'total' | 'event' */
  kind: 'streak' | 'total' | 'event';
  /** streak/total 기준값. event는 0 */
  threshold: number;
}

export interface EarnedBadge {
  id: BadgeId;
  /** 획득 시각 epoch ms */
  earnedAt: number;
}
```

BadgeDef 고정 테이블 (9개):

| id | name | kind | threshold |
|---|---|---|---|
| first_step | 첫 걸음 | total | 1 |
| streak_3 | 삼일의 벽 | streak | 3 |
| streak_7 | 일주일 완주 | streak | 7 |
| streak_14 | 2주 지킴이 | streak | 14 |
| streak_30 | 한 달 절약왕 | streak | 30 |
| streak_60 | 두 달 철벽 | streak | 60 |
| streak_100 | 백일의 기적 | streak | 100 |
| total_50 | 누적 50일 | total | 50 |
| comeback | 다시 시작 | event | 0 |

---

### Entity: Profile

```ts
export interface Profile {
  /** UUID v4, 앱 최초 실행 시 생성 */
  deviceUserId: string;
  /** 랭킹 표시 닉네임, 2~10자 */
  nickname: string;
  /** 본인 초대 코드, 6자 대문자 영숫자 (예: 'K3M9QZ') */
  inviteCode: string;
  /** 참여 중인 랭킹방 코드 | null */
  roomCode: string | null;
  /** 온보딩 고지 확인 여부 */
  onboardedAt: number | null;
}
```

제약:
- `nickname` 2~10자, 공백만으로 구성 불가.
- `inviteCode` `/^[A-Z0-9]{6}$/`.

---

### Entity: RankEntry (외부 API 응답)

```ts
export interface RankEntry {
  userId: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  /** 1부터 시작하는 순위 */
  rank: number;
}
```

---

### localStorage 키 정의

| Key | Value Type | 예시 | 예상 크기 |
|---|---|---|---|
| `zss.v1.checkins` | `CheckIn[]` | `[{"date":"2026-08-20","createdAt":1755..,"source":"manual","memo":"물만 마심"}]` | 1건 ≈ 100B · 730건(2년) ≈ **73KB** |
| `zss.v1.streak` | `StreakState` | `{"current":7,"best":21,"lastCheckInDate":"2026-08-20","totalDays":58}` | ≈ **120B** |
| `zss.v1.recovery` | `RecoveryWallet` | `{"tickets":1,"earnedToday":1,"earnedTodayDate":"2026-08-20","usages":[]}` | 사용이력 50건 포함 ≈ **3KB** |
| `zss.v1.badges` | `EarnedBadge[]` | `[{"id":"streak_7","earnedAt":1755..}]` | 9건 ≈ **400B** |
| `zss.v1.profile` | `Profile` | `{"deviceUserId":"a1b2...","nickname":"절약러","inviteCode":"K3M9QZ","roomCode":"AB12CD","onboardedAt":1755..}` | ≈ **200B** |
| `zss.v1.rankCache` | `{ fetchedAt: number; entries: RankEntry[] }` | — | 100명 ≈ **12KB** |
| `zss.v1.flags` | `{ onboardingSeen: boolean; lastSeenBadgeId: BadgeId \| null }` | — | ≈ **100B** |

**총 예상 크기: 약 89KB (5MB 한도의 1.8%)** — 여유 충분.

저장 유틸(템플릿 제공 localStorage helper 사용):
```ts
storage.get<T>(key: string, fallback: T): T   // JSON.parse 실패 시 fallback 반환
storage.set<T>(key: string, value: T): boolean // QuotaExceededError 시 false 반환
```

---

## Feature List

### F1. 데이터 레이어 & 스트릭 엔진

- **Description**: `CheckIn[]`을 단일 진실 공급원으로 삼아 스트릭·통계·뱃지를 계산하는 순수 함수 레이어와 localStorage 영속 계층을 구현한다. UI는 이 레이어의 훅(`useCheckIns`, `useStreak`)만 사용하며 localStorage에 직접 접근하지 않는다. 손상된 저장 데이터는 자동 복구하여 앱이 절대 죽지 않게 한다.
- **Data**: `CheckIn`, `StreakState`, `Profile`, `zss.v1.checkins`, `zss.v1.streak`, `zss.v1.profile`
- **API**: 없음 (로컬 전용)
- **Requirements**:
  - `calcStreak(checkins: CheckIn[], today: string): StreakState` 순수 함수 제공
  - `addCheckIn(date, source, memo?)` / `hasCheckIn(date)` / `getCheckInsInRange(from, to)` 제공
  - 앱 최초 실행 시 `Profile` 자동 생성

**Acceptance Criteria**

- **AC-1 [U][P0]**: Scenario: 스트릭 계산 정확성
  Given `checkins = [{date:"2026-08-18"},{date:"2026-08-19"},{date:"2026-08-20"}]`, `today = "2026-08-20"`
  When `calcStreak(checkins, today)` 호출
  Then 반환값은 `{ current: 3, best: 3, lastCheckInDate: "2026-08-20", totalDays: 3 }`

- **AC-2 [U][P0]**: Scenario: 어제까지만 체크인한 경우 스트릭 유지
  Given `checkins = [{date:"2026-08-18"},{date:"2026-08-19"}]`, `today = "2026-08-20"`
  When `calcStreak(checkins, today)` 호출
  Then `current`는 `2` (오늘 미체크인이어도 어제 연속이면 스트릭 유지)

- **AC-3 [U][P0]**: Scenario: 이틀 이상 공백 시 스트릭 초기화
  Given `checkins = [{date:"2026-08-10"},{date:"2026-08-11"},{date:"2026-08-17"}]`, `today = "2026-08-20"`
  When `calcStreak(checkins, today)` 호출
  Then 반환값은 `{ current: 0, best: 2, lastCheckInDate: "2026-08-17", totalDays: 3 }`

- **AC-4 [E][P0]**: Scenario: 체크인 저장
  Given `zss.v1.checkins`가 `[]`일 때
  When `addCheckIn("2026-08-20", "manual", "점심 도시락")` 호출
  Then `localStorage['zss.v1.checkins']`에 `date:"2026-08-20"`, `source:"manual"`, `memo:"점심 도시락"` 항목 1건이 저장됨
  And `zss.v1.streak`가 `{ current: 1, best: 1, lastCheckInDate: "2026-08-20", totalDays: 1 }`로 갱신됨

- **AC-5 [W][P1]**: Scenario: 손상된 JSON 자동 복구
  Given `localStorage['zss.v1.checkins']` 값이 `"{{{broken"`일 때
  When 앱이 `useCheckIns()`로 데이터를 읽음
  Then 빈 배열 `[]`을 반환하고 `zss.v1.checkins`를 `"[]"`로 덮어씀
  And `console.error`를 호출하지 않음 (앱은 정상 렌더)

- **AC-6 [W][P1]**: Scenario: localStorage 용량 초과
  Given `storage.set`이 `QuotaExceededError`를 던지는 상황
  When `addCheckIn("2026-08-20", "manual")` 호출
  Then 함수는 `false`를 반환하고 메모리 상태를 이전 값으로 롤백함
  And 호출한 화면은 Toast `"저장 공간이 부족해요. 오래된 기록을 정리해주세요"`를 표시함

- **AC-7 [W][P1]**: Scenario: 미래 날짜 체크인 거부
  Given `today = "2026-08-20"`일 때
  When `addCheckIn("2026-08-21", "manual")` 호출
  Then 저장되지 않고 `{ ok: false, reason: "FUTURE_DATE" }`를 반환함

- **AC-8 [S][P1]**: Scenario: 초기 로딩 상태
  While `useCheckIns()`가 localStorage 읽기를 완료하기 전
  The system shall `isLoading: true`를 노출하고, 이를 구독하는 화면은 TDS Skeleton(또는 `Paragraph.Text` 플레이스홀더)을 렌더한다
  And 로딩 완료 후 `isLoading: false`로 전환한다

---

### F2. 오늘 무지출 체크인 (홈)

- **Description**: 홈 화면에서 오늘 하루 지출 0원을 달성했는지 단일 버튼으로 체크인한다. 체크인 완료 시 현재 스트릭 숫자가 CountUp 히어로로 즉시 갱신되고, 하루 1회만 가능하도록 상태가 잠긴다. 선택적으로 50자 이내 메모를 남길 수 있다.
- **Data**: `CheckIn`, `StreakState`
- **API**: 없음
- **Requirements**: 홈 라우트 `/`, `SummaryHero`로 현재 스트릭 표시, `SubmitFooter`에 1차 액션 배치

**Acceptance Criteria**

- **AC-1 [E][P0]**: Scenario: 오늘 무지출 체크인 성공
  Given `today = "2026-08-20"`이고 `zss.v1.checkins`에 해당 날짜 기록이 없을 때
  When 홈 화면 `data-testid="checkin-button"` 버튼을 탭
  Then `CheckIn { date: "2026-08-20", source: "manual" }`이 저장됨
  And Toast `"오늘도 0원! 스트릭 1일째"`가 표시됨
  And `data-testid="streak-hero"`의 숫자가 `1`로 CountUp 애니메이션됨

- **AC-2 [S][P0]**: Scenario: 이미 체크인한 상태
  While `zss.v1.checkins`에 `today` 항목이 존재할 때
  The system shall `data-testid="checkin-button"`을 `disabled` 상태로 렌더하고 라벨을 `"오늘 체크인 완료"`로 표시한다
  And 버튼 아래에 `Chip` 컴포넌트로 `"내일 다시 도전"` 텍스트를 표시한다

- **AC-3 [E][P1]**: Scenario: 메모와 함께 체크인
  Given 홈 화면에서 `data-testid="memo-sheet-open"`을 탭해 TDS `BottomSheet`가 열렸을 때
  When TDS `TextField`에 `"편의점 안 감"`을 입력하고 `"저장"` 버튼 탭
  Then `CheckIn { date: "2026-08-20", source: "manual", memo: "편의점 안 감" }`이 저장됨
  And BottomSheet가 닫힘

- **AC-4 [W][P1]**: Scenario: 메모 51자 초과 차단
  Given 메모 BottomSheet가 열려 있을 때
  When TextField에 51자 문자열을 입력 시도
  Then 입력값이 50자에서 잘리고 헬퍼 텍스트 `"메모는 50자까지 입력할 수 있어요"`가 표시됨

- **AC-5 [W][P1]**: Scenario: 중복 체크인 방지 (경합)
  Given `today = "2026-08-20"` 체크인이 이미 저장된 상태에서
  When `data-testid="checkin-button"`을 프로그래밍적으로 재호출
  Then 저장되지 않고 Toast `"오늘은 이미 체크인했어요"`가 표시됨
  And `zss.v1.checkins`의 `"2026-08-20"` 항목 수는 `1`로 유지됨

- **AC-6 [E][P1]**: Scenario: 자정 경과 시 버튼 재활성화
  Given 앱이 백그라운드에 있다가 KST 날짜가 `"2026-08-20"` → `"2026-08-21"`로 바뀐 뒤 포그라운드로 복귀
  When `visibilitychange` 이벤트가 발생
  Then `todayKST()`를 재평가하여 `data-testid="checkin-button"`이 `enabled`로 전환됨

- **AC-7 [U][P1]**: Scenario: 첫 사용자 빈 상태
  Given `zss.v1.checkins`가 `[]`이고 뱃지가 0개일 때
  When 홈 화면 진입
  Then `data-testid="streak-hero"`가 `0`을 표시하고, `Asset.ContentIcon`과 함께 `"첫 무지출 도전을 시작해보세요"` 문구를 렌더함

- **AC-8 [U][P0]**: Scenario: 홈 레이아웃 계약
  Given 홈 화면이 렌더될 때
  Then 화면은 `ScreenScaffold`로 감싸져 있고
  And `data-testid="streak-hero"` `SummaryHero` 1개와 `data-testid="streak-stat-card"` `Card` 1개(최고 기록·누적 일수 표시)를 포함하며
  And 1차 액션은 `SubmitFooter` 내부의 `display="block"` TDS Button이다

---

### F3. 기록 캘린더 (스트릭 시각화)

- **Description**: 월 단위 캘린더 그리드로 무지출 성공일을 시각화한다. 성공(manual), 복구(recovery), 실패(미체크인) 3가지 상태를 색상으로 구분하며 과거 달로 이동할 수 있다. 특정 날짜를 탭하면 메모와 복구 가능 여부를 확인할 수 있다.
- **Data**: `CheckIn[]`, `RecoveryWallet`
- **API**: 없음
- **Requirements**: 라우트 `/calendar`, 7열 CSS Grid(커스텀 CSS 허용), 각 날짜 셀 최소 44×44px

**Acceptance Criteria**

- **AC-1 [U][P0]**: Scenario: 캘린더 렌더링
  Given `checkins`에 `"2026-08-01"(manual)`, `"2026-08-02"(recovery)`가 있고 현재 월이 2026-08일 때
  When `/calendar` 진입
  Then `data-testid="cal-cell-2026-08-01"`은 `data-state="success"`,
  And `data-testid="cal-cell-2026-08-02"`는 `data-state="recovered"`,
  And `data-testid="cal-cell-2026-08-03"`은 `data-state="miss"` 속성을 가짐

- **AC-2 [E][P0]**: Scenario: 이전 달 이동
  Given `/calendar`에서 현재 월이 `2026-08`일 때
  When `data-testid="cal-prev"` 버튼 탭
  Then 헤더 텍스트가 `"2026년 7월"`로 바뀌고 7월 날짜 셀 31개가 렌더됨

- **AC-3 [E][P1]**: Scenario: 날짜 상세 확인
  Given `"2026-08-01"`에 `memo: "물만 마심"`이 저장되어 있을 때
  When `data-testid="cal-cell-2026-08-01"` 탭
  Then TDS `BottomSheet`가 열리고 `"2026년 8월 1일"`과 `"물만 마심"`이 표시됨

- **AC-4 [W][P1]**: Scenario: 미래 달 이동 차단
  Given 오늘이 `"2026-08-20"`이고 현재 표시 월이 `2026-08`일 때
  When `data-testid="cal-next"` 버튼을 확인
  Then 해당 버튼은 `disabled` 상태이고 탭해도 월이 변경되지 않음

- **AC-5 [W][P1]**: Scenario: 기록 없는 과거 달
  Given `2026-01`에 체크인이 0건일 때
  When 해당 달로 이동
  Then 캘린더 그리드는 정상 렌더되고 하단에 `Asset.ContentIcon`과 `"이 달에는 기록이 없어요"` 문구가 표시됨

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  While `useCheckIns().isLoading === true`
  The system shall 날짜 셀 자리에 `data-testid="cal-skeleton"` 플레이스홀더 그리드를 렌더한다

- **AC-7 [U][P0]**: Scenario: 터치 타깃
  Given 캘린더가 렌더될 때
  Then 모든 `data-testid^="cal-cell-"` 요소의 계산된 width와 height는 각각 44px 이상이다

- **AC-8 [E][P1]**: Scenario: 복구 진입
  Given `"2026-08-18"`이 미체크인이고 오늘이 `"2026-08-20"`(7일 이내)일 때
  When 해당 셀의 BottomSheet에서 `"복구하기"` 버튼 탭
  Then `navigate('/recover', { state: { targetDate: "2026-08-18" } })`가 호출됨

---

### F4. 스트릭 복구 (리워드 광고 게이팅)

- **Description**: 스트릭이 끊긴 날을 복구권으로 메꿔 연속 기록을 되살린다. 복구권은 `TossRewardAd` 시청 완료 시 하루 최대 1개, 최대 보유 3개까지 획득한다. 복구 대상은 최근 7일 이내 미체크인 날짜로 제한한다.
- **Data**: `RecoveryWallet`, `CheckIn`(source='recovery'), `StreakState`
- **API**: 없음 (광고는 SDK)
- **Requirements**: 라우트 `/recover`, `TossRewardAd`로 복구권 획득 게이팅

**Acceptance Criteria**

- **AC-1 [E][P0]**: Scenario: 광고 시청 후 복구권 획득
  Given `zss.v1.recovery = { tickets: 0, earnedToday: 0, earnedTodayDate: "2026-08-19", usages: [] }`이고 오늘이 `"2026-08-20"`일 때
  When `data-testid="earn-ticket"` 버튼을 탭하여 `TossRewardAd` 시청을 완료
  Then `zss.v1.recovery`가 `{ tickets: 1, earnedToday: 1, earnedTodayDate: "2026-08-20" }`로 갱신됨
  And Toast `"복구권 1개를 받았어요"`가 표시됨

- **AC-2 [E][P0]**: Scenario: 복구권 사용
  Given `tickets: 1`이고 `"2026-08-18"`이 미체크인, `checkins`에 `"2026-08-17"`, `"2026-08-19"`, `"2026-08-20"`가 있을 때
  When `data-testid="use-ticket"` 버튼 탭
  Then `CheckIn { date: "2026-08-18", source: "recovery" }`가 저장되고 `tickets`가 `0`이 됨
  And `calcStreak` 결과 `current`가 `4`로 갱신됨
  And Toast `"2026년 8월 18일을 복구했어요"`가 표시됨

- **AC-3 [W][P0]**: Scenario: 일일 획득 상한 초과
  Given `zss.v1.recovery = { tickets: 1, earnedToday: 1, earnedTodayDate: "2026-08-20" }`이고 오늘이 `"2026-08-20"`일 때
  When `data-testid="earn-ticket"` 상태를 확인
  Then 버튼은 `disabled`이고 라벨은 `"오늘은 이미 받았어요"`이며, 광고가 로드되지 않음

- **AC-4 [W][P1]**: Scenario: 보유 상한 초과
  Given `tickets: 3`일 때
  When `data-testid="earn-ticket"` 상태를 확인
  Then 버튼은 `disabled`이고 헬퍼 텍스트 `"복구권은 최대 3개까지 보유할 수 있어요"`가 표시됨

- **AC-5 [W][P1]**: Scenario: 광고 시청 중단
  Given `tickets: 0`일 때
  When `TossRewardAd` 광고가 보상 조건 미달로 종료(사용자가 중도 닫음)
  Then `tickets`는 `0`으로 유지되고 Toast `"광고를 끝까지 봐야 복구권을 받을 수 있어요"`가 표시됨

- **AC-6 [W][P1]**: Scenario: 7일 초과 날짜 복구 차단
  Given 오늘이 `"2026-08-20"`이고 `location.state.targetDate = "2026-08-05"`일 때
  When `/recover` 진입
  Then `data-testid="use-ticket"`은 `disabled`이고 `"최근 7일 이내 날짜만 복구할 수 있어요"`가 표시됨

- **AC-7 [S][P1]**: Scenario: 광고 로딩 상태
  While 리워드 광고 로드가 진행 중일 때
  The system shall `data-testid="earn-ticket"`을 `loading` 상태로 렌더하고 중복 탭을 무시한다

- **AC-8 [U][P0]**: Scenario: 복구 화면 레이아웃 계약
  Given `/recover` 화면이 렌더될 때
  Then `ScreenScaffold`로 감싸져 있고 `data-testid="ticket-card"` `Card` 1개(보유 복구권 수를 t2 강조 타이포로 표시)를 포함하며
  And 1차 액션(`data-testid="use-ticket"`)은 `SubmitFooter` 내 `display="block"` 버튼이다

---

### F5. 무지출 통계 (주간/월간 달성률)

- **Description**: 최근 7일·최근 30일의 무지출 달성률과 추이를 카드로 제공한다. 달성률은 `무지출일수 / 기간일수 × 100`(소수점 첫째자리 반올림)으로 계산하며, `Sparkline`으로 8주 추이를, `MiniBar`로 요일별 성공 비율을 시각화한다.
- **Data**: `CheckIn[]`
- **API**: 없음
- **Requirements**: 라우트 `/stats`, 상단 TDS `Tab`으로 `주간`/`월간` 전환

**Acceptance Criteria**

- **AC-1 [U][P0]**: Scenario: 주간 달성률 계산
  Given 오늘이 `"2026-08-20"`이고 최근 7일(`08-14`~`08-20`) 중 5일에 체크인이 있을 때
  When `/stats`의 `주간` 탭 진입
  Then `data-testid="rate-hero"`가 `71.4%`를 표시함 (5/7 = 71.428… → 71.4)

- **AC-2 [U][P0]**: Scenario: 월간 달성률 계산
  Given 오늘이 `"2026-08-20"`이고 최근 30일(`07-22`~`08-20`) 중 18일에 체크인이 있을 때
  When `월간` 탭 선택
  Then `data-testid="rate-hero"`가 `60%`를 표시하고 `data-testid="rate-detail"`이 `"30일 중 18일 성공"`을 표시함

- **AC-3 [U][P0]**: Scenario: 통계 화면 레이아웃 계약
  Given `/stats`가 렌더될 때
  Then `ScreenScaffold` 내부에 `data-testid="rate-hero"`(SummaryHero, CountUp), `data-testid="trend-card"` Card(Sparkline 포함), `data-testid="weekday-card"` Card(MiniBar 7개 포함)가 존재함

- **AC-4 [U][P1]**: Scenario: 요일별 성공 비율
  Given 최근 8주 중 월요일 8회 기회 중 6회 성공일 때
  When `/stats` 진입
  Then `data-testid="weekday-bar-MON"`의 `data-value` 속성이 `75`임

- **AC-5 [W][P1]**: Scenario: 데이터 0건 빈 상태
  Given `checkins`가 `[]`일 때
  When `/stats` 진입
  Then `data-testid="rate-hero"`는 `0%`를 표시하고, `Sparkline`/`MiniBar` 대신 `Asset.ContentIcon`과 `"기록이 쌓이면 통계를 보여드릴게요"`가 렌더됨

- **AC-6 [W][P1]**: Scenario: 기록 기간이 7일 미만
  Given 첫 체크인이 `"2026-08-18"`이고 오늘이 `"2026-08-20"`(총 3일)일 때
  When `주간` 탭 진입
  Then 분모는 실제 경과일 `3`을 사용하여 `data-testid="rate-detail"`이 `"3일 중 N일 성공"`을 표시함

- **AC-7 [S][P1]**: Scenario: 통계 계산 로딩
  While `useCheckIns().isLoading === true`
  The system shall `data-testid="stats-skeleton"`을 렌더하고 차트를 마운트하지 않는다

- **AC-8 [E][P2]**: Scenario: 탭 전환 유지
  Given `월간` 탭이 선택된 상태에서
  When `/calendar`로 이동 후 `/stats`로 복귀
  Then 탭은 `주간`(기본값)으로 초기화되고 `data-testid="rate-hero"`가 주간 값을 표시함

---

### F6. 마일스톤 뱃지 수집

- **Description**: 스트릭·누적 일수·이벤트 조건을 만족하면 9종 뱃지를 자동 획득한다. 체크인 저장 직후 뱃지 조건을 평가하고, 신규 획득 시 `AlertDialog`로 1회 축하 안내를 띄운다. 뱃지 컬렉션 화면에서 획득/미획득을 3열 그리드로 확인한다.
- **Data**: `EarnedBadge[]`, `BadgeDef[]`, `StreakState`
- **API**: 없음
- **Requirements**: 라우트 `/badges`, `evaluateBadges(streak, earned): BadgeId[]` 순수 함수

**Acceptance Criteria**

- **AC-1 [E][P0]**: Scenario: 스트릭 7일 뱃지 획득
  Given `earnedBadges`에 `streak_7`이 없고 체크인 저장 후 `StreakState.current === 7`일 때
  When `evaluateBadges` 실행
  Then `zss.v1.badges`에 `{ id: "streak_7", earnedAt: <number> }`가 추가됨
  And TDS `AlertDialog`가 열리고 제목 `"일주일 완주 뱃지 획득!"`이 표시됨

- **AC-2 [U][P0]**: Scenario: 뱃지 중복 획득 방지
  Given `earnedBadges`에 `streak_7`이 이미 존재하고 `current === 8`일 때
  When `evaluateBadges` 실행
  Then `zss.v1.badges` 내 `streak_7` 항목 수는 `1`로 유지되고 AlertDialog가 열리지 않음

- **AC-3 [E][P0]**: Scenario: 복구권 최초 사용 이벤트 뱃지
  Given `earnedBadges`에 `comeback`이 없을 때
  When 복구권을 사용해 `CheckIn { source: "recovery" }`가 최초로 저장됨
  Then `comeback` 뱃지가 획득되고 AlertDialog 제목 `"다시 시작 뱃지 획득!"`이 표시됨

- **AC-4 [U][P0]**: Scenario: 뱃지 컬렉션 렌더
  Given `earnedBadges = [{id:"first_step"},{id:"streak_3"}]`일 때
  When `/badges` 진입
  Then `data-testid="badge-first_step"`과 `data-testid="badge-streak_3"`는 `data-earned="true"`,
  And 나머지 7개는 `data-earned="false"` 속성을 가지며 총 9개 셀이 렌더됨

- **AC-5 [W][P1]**: Scenario: 알 수 없는 뱃지 ID 방어
  Given `zss.v1.badges`에 `[{"id":"streak_999","earnedAt":1}]`가 저장되어 있을 때
  When `/badges` 진입
  Then 해당 항목은 무시되고 정의된 9개 뱃지만 렌더되며 런타임 에러가 발생하지 않음

- **AC-6 [W][P1]**: Scenario: 뱃지 저장 실패
  Given `storage.set`이 `false`를 반환하는 상황에서
  When 신규 뱃지 획득이 발생
  Then AlertDialog 대신 Toast `"뱃지 저장에 실패했어요. 잠시 후 다시 시도해주세요"`가 표시됨

- **AC-7 [U][P1]**: Scenario: 뱃지 0개 빈 상태
  Given `earnedBadges`가 `[]`일 때
  When `/badges` 진입
  Then 9개 셀 모두 `data-earned="false"`로 렌더되고 상단에 `"첫 체크인으로 '첫 걸음' 뱃지를 받아보세요"` 안내가 표시됨

- **AC-8 [U][P1]**: Scenario: 미획득 뱃지 조건 안내
  Given `streak_30`이 미획득이고 `StreakState.current === 12`일 때
  When `data-testid="badge-streak_30"` 탭
  Then `BottomSheet`에 `"연속 30일 달성 시 획득 · 18일 남음"`이 표시됨

---

### F7. 친구 초대 & 랭킹

- **Description**: 6자리 초대 코드로 랭킹방에 참여해 친구들의 현재 스트릭 순위를 확인한다. 외부 API 서버(별도 Railway 배포)에 스트릭을 동기화하고 방 순위를 조회하며, 네트워크 실패 시 캐시된 순위를 표시하고 로컬 전용 모드로 동작한다. 초대는 코드 복사 방식만 사용하며 외부 링크·앱 설치 유도를 하지 않는다.
- **Data**: `Profile`, `RankEntry[]`, `zss.v1.rankCache`
- **API**: `POST /v1/sync`, `POST /v1/rooms/join`, `GET /v1/rooms/{roomCode}/rank` (상세는 API Contract 참조)
- **Requirements**: 라우트 `/rank`, 닉네임 설정 BottomSheet, 리스트 20명 초과 시 가상 스크롤

**Acceptance Criteria**

- **AC-1 [E][P0]**: Scenario: 랭킹방 참여
  Given `Profile.roomCode === null`이고 닉네임 `"절약러"`가 설정되어 있을 때
  When `data-testid="join-input"`에 `"AB12CD"` 입력 후 `data-testid="join-submit"` 탭하고 서버가 `200 { roomCode: "AB12CD", memberCount: 4 }` 응답
  Then `zss.v1.profile.roomCode`가 `"AB12CD"`로 저장되고 랭킹 리스트가 렌더됨

- **AC-2 [E][P0]**: Scenario: 순위 조회 및 표시
  Given `roomCode = "AB12CD"`이고 서버가 `200 { entries: [{userId:"u1",nickname:"절약러",currentStreak:7,bestStreak:12,totalDays:30,rank:1}] }` 응답할 때
  When `/rank` 진입
  Then `data-testid="rank-row-u1"`이 렌더되고 `"1위"`, `"절약러"`, `"7일"` 텍스트를 포함함
  And 본인 행(`userId === Profile.deviceUserId`)은 `data-me="true"` 속성을 가짐

- **AC-3 [E][P0]**: Scenario: 체크인 후 서버 동기화
  Given `roomCode`가 설정된 상태에서
  When 홈에서 체크인이 성공적으로 저장됨
  Then `POST /v1/sync`가 `{ userId, nickname, roomCode, currentStreak, bestStreak, totalDays }` 바디로 1회 호출됨

- **AC-4 [W][P1]**: Scenario: 네트워크 실패 시 캐시 폴백
  Given `zss.v1.rankCache.entries`에 3건이 저장되어 있고 `GET /v1/rooms/AB12CD/rank`가 네트워크 오류로 실패할 때
  When `/rank` 진입
  Then 캐시된 3건이 렌더되고 상단에 `Chip`으로 `"오프라인 · 마지막 갱신 결과"`가 표시됨
  And `console.error`가 호출되지 않음

- **AC-5 [W][P1]**: Scenario: 존재하지 않는 초대 코드
  Given 서버가 `404 { error: "ROOM_NOT_FOUND" }`를 응답할 때
  When `data-testid="join-input"`에 `"ZZ9999"` 입력 후 참여 시도
  Then TextField 하단에 에러 메시지 `"존재하지 않는 초대 코드예요"`가 표시되고 `roomCode`는 `null`로 유지됨

- **AC-6 [W][P1]**: Scenario: 닉네임 유효성
  Given 닉네임 설정 BottomSheet가 열려 있을 때
  When TextField에 `"  "`(공백 2자)를 입력하고 저장 탭
  Then 에러 메시지 `"닉네임은 2~10자로 입력해주세요"`가 표시되고 저장되지 않음

- **AC-7 [S][P1]**: Scenario: 랭킹 로딩/빈 상태
  While `GET /v1/rooms/{roomCode}/rank` 요청이 진행 중일 때
  The system shall `data-testid="rank-skeleton"` 행 5개를 렌더한다
  And `Profile.roomCode === null`이면 `Asset.ContentIcon`과 `"친구 코드를 입력하고 순위를 겨뤄보세요"` 및 본인 초대 코드 `Card`를 렌더한다

- **AC-8 [E][P1]**: Scenario: 초대 코드 복사
  Given `Profile.inviteCode === "K3M9QZ"`일 때
  When `data-testid="copy-invite"` 버튼 탭
  Then 클립보드에 `"K3M9QZ"`가 복사되고 Toast `"초대 코드를 복사했어요"`가 표시됨
  And `window.open` 또는 `window.location.href` 호출이 발생하지 않음

---

### F8. 광고 배치 & 토스 검수 컴플라이언스

- **Description**: 배너 광고를 콘텐츠를 가리지 않는 위치에 배치하고, 토스 검수 반려 사유(외부 이탈, 콘솔 에러, 하드코딩 색상, 외부 로깅 등)를 전역 규칙으로 강제한다. 첫 실행 시 앱 사용 안내 BottomSheet를 1회 노출한다.
- **Data**: `zss.v1.flags`, `Profile.onboardedAt`
- **API**: 없음
- **Requirements**: `AdSlot` 배치 3곳, ESLint/빌드 검증 룰

**Acceptance Criteria**

- **AC-1 [U][P0]**: Scenario: 배너 광고 배치
  Given 앱이 렌더될 때
  Then `/`(스트릭 카드와 뱃지 미리보기 섹션 사이), `/stats`(통계 카드 전체 하단), `/badges`(그리드 하단)에 각각 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개가 존재함
  And `SubmitFooter` 및 `FloatingTabBar`와 겹치지 않음(광고 컨테이너는 스크롤 콘텐츠 흐름 내부에 위치)

- **AC-2 [W][P0]**: Scenario: 외부 도메인 이탈 금지
  Given 프로덕션 번들이 빌드되었을 때
  When 소스 전체를 `window.location.href =` / `window.open(` 패턴으로 검사
  Then 매칭 건수는 `0`임 (외부 URL 이동 코드 없음)

- **AC-3 [U][P0]**: Scenario: 콘솔 에러 0개
  Given 프로덕션 빌드를 실행하고 `/` → `/calendar` → `/stats` → `/badges` → `/rank`를 순차 방문했을 때
  Then `console.error` 호출 횟수는 `0`임

- **AC-4 [W][P0]**: Scenario: HEX 색상 하드코딩 금지
  Given `src/**/*.{ts,tsx,css}`를 정규식 `/#[0-9a-fA-F]{3,8}\b/`로 검사할 때
  Then 매칭 건수는 `0`이며 모든 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값을 사용함

- **AC-5 [W][P0]**: Scenario: 외부 로깅·앱 설치 유도 금지
  Given 소스 전체를 검사할 때
  Then `google-analytics`, `gtag`, `amplitude`, `mixpanel` 문자열 매칭 건수는 `0`이고
  And UI 텍스트에 `"설치"`, `"다운로드"`, `"앱스토어"`, `"플레이스토어"` 문구가 존재하지 않음

- **AC-6 [U][P0]**: Scenario: 구버전 OS 호환
  Given 빌드 타깃이 Android 7+ / iOS 16+일 때
  Then 소스에서 `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `Array.prototype.findLast` 사용 건수는 `0`이며 Vite build target은 `es2019`로 설정됨

- **AC-7 [E][P1]**: Scenario: 첫 실행 안내 1회 노출
  Given `zss.v1.flags.onboardingSeen`이 `false`(또는 키 없음)일 때
  When 앱 최초 진입
  Then TDS `BottomSheet`에 `"하루 지출 0원에 성공하면 체크인하세요"` 안내가 표시됨
  And `"시작하기"` 버튼 탭 시 `zss.v1.flags.onboardingSeen = true`가 저장되고 이후 재진입 시 노출되지 않음

- **AC-8 [W][P1]**: Scenario: 광고 로드 실패
  Given `AdSlot`이 광고 로드에 실패했을 때
  When 화면이 렌더됨
  Then 광고 영역은 높이 0으로 접히고 레이아웃 시프트 없이 나머지 콘텐츠가 정상 표시됨
  And 에러 문구나 빈 회색 박스를 노출하지 않음

---

## Screen Definitions

### S1. 홈 (오늘 체크인)
- **Route**: `/`
- **Feature**: F2, F1, F8
- **TDS 컴포넌트**: `Top`(타이틀 `"무지출 챌린지"`), `Card`(스트릭 통계), `Button`(체크인 · `display="block"`), `Chip`(상태 뱃지), `BottomSheet`(메모 입력), `TextField`(메모), `Toast`(성공/실패), `Spacing`, `Paragraph.Text`
- **템플릿 컴포넌트**: `ScreenScaffold`, `SubmitFooter`, `SummaryHero`(CountUp), `AdSlot`, `FloatingTabBar`, `Asset.ContentIcon`
- **Layout 계약**:
  - `ScreenScaffold` > `Top` > `SummaryHero`(`data-testid="streak-hero"`, 현재 스트릭 숫자 CountUp, t1 크기) > `Spacing size={16}` > `Card`(`data-testid="streak-stat-card"`, 최고 기록·누적 일수 2열, 값은 t3 강조) > `Spacing size={24}` > `AdSlot` > `Spacing size={16}` > `Card`(`data-testid="badge-preview-card"`, 최근 획득 뱃지 3개)
  - 1차 액션은 `SubmitFooter` 내 `Button display="block"` (`data-testid="checkin-button"`, 높이 ≥ 52px)
- **상태**:
  - Loading: `data-testid="home-skeleton"` — SummaryHero·Card 자리 플레이스홀더
  - Empty: 체크인 0건 → SummaryHero `0`, `Asset.ContentIcon` + `"첫 무지출 도전을 시작해보세요"`
  - Error: 저장 실패 → Toast `"저장 공간이 부족해요. 오래된 기록을 정리해주세요"`
- **터치**: 체크인 버튼 ≥ 52px, 메모 열기 버튼 ≥ 44px, 뱃지 미리보기 카드 ≥ 44px
- **키보드**: 메모 `BottomSheet`는 키보드 노출 시 `SubmitFooter`가 키보드 위로 밀려 올라감(`env(keyboard-inset-height)` 대응). `TextField`는 `enterKeyHint="done"`, 완료 시 blur.
- **Navigation state contract**:
  - Outgoing: 뱃지 미리보기 카드 탭 → `navigate('/badges')` (state 없음)
  - Outgoing: 스트릭 카드 탭 → `navigate('/calendar')` (state 없음)
  - Incoming: `location.state` 사용 안 함 (`undefined` 가정, 접근 금지)

---

### S2. 기록 캘린더
- **Route**: `/calendar`
- **Feature**: F3
- **TDS 컴포넌트**: `Top`(타이틀 `"기록"`), `Button`(이전/다음 달 · 아이콘), `Paragraph.Text`(월 헤더), `BottomSheet`(날짜 상세), `ListRow`(상세 항목), `Chip`(성공/복구 라벨), `Spacing`
- **템플릿 컴포넌트**: `ScreenScaffold`, `FloatingTabBar`, `Asset.ContentIcon`
- **Layout 계약**: 커스텀 CSS Grid `grid-template-columns: repeat(7, 1fr)` 허용. 각 셀은 `data-testid="cal-cell-YYYY-MM-DD"` + `data-state="success"|"recovered"|"miss"|"future"`. 색상은 `var(--tds-color-*)` 변수만 사용.
- **상태**:
  - Loading: `data-testid="cal-skeleton"` 42개 셀 플레이스홀더
  - Empty: 해당 월 기록 0건 → 그리드 하단 `Asset.ContentIcon` + `"이 달에는 기록이 없어요"`
  - Error: 데이터 파싱 실패 → 빈 그리드 + Toast `"기록을 불러오지 못했어요"`
- **스크롤**: 월 단위 고정 그리드(최대 6행)이므로 가상 스크롤 불필요. 세로 스크롤은 페이지 전체 스크롤로 처리.
- **터치**: 날짜 셀 ≥ 44×44px, 월 이동 버튼 ≥ 44×44px
- **Navigation state contract**:
  - Outgoing: 날짜 BottomSheet의 `"복구하기"` → `navigate('/recover', { state: { targetDate: string } })` — `targetDate` 형식 `'YYYY-MM-DD'`
  - Incoming: `location.state = { focusDate?: string } | undefined` — 전달 시 해당 월로 초기 렌더

---

### S3. 스트릭 복구
- **Route**: `/recover`
- **Feature**: F4
- **TDS 컴포넌트**: `Top`(뒤로가기 + 타이틀 `"스트릭 복구"`), `Card`(복구권 보유 현황), `Button`(복구권 획득 / 사용), `Paragraph.Text`, `AlertDialog`(복구 확인), `Toast`, `Spacing`
- **템플릿 컴포넌트**: `ScreenScaffold`, `SubmitFooter`, `TossRewardAd`
- **Layout 계약**:
  - `ScreenScaffold` > `Top` > `Card`(`data-testid="ticket-card"`, 보유 복구권 수를 t2 강조 타이포 + `Chip`으로 `"오늘 획득 가능"` 표시) > `Spacing size={16}` > `Card`(`data-testid="target-card"`, 복구 대상 날짜 표시)
  - 복구권 획득: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 로 `data-testid="earn-ticket"` 버튼 게이팅
  - 1차 액션 `data-testid="use-ticket"`은 `SubmitFooter` 내 `display="block"` 버튼
- **상태**:
  - Loading: 광고 로드 중 → `earn-ticket` 버튼 `loading` 상태, 중복 탭 무시
  - Empty: `tickets === 0` → `"광고를 보고 복구권을 받아보세요"` 안내, `use-ticket` `disabled`
  - Error: 광고 중도 종료 → Toast `"광고를 끝까지 봐야 복구권을 받을 수 있어요"`
- **터치**: 모든 버튼 ≥ 52px
- **Navigation state contract**:
  - Incoming: `location.state = { targetDate: string } | undefined` — `undefined`이면 `checkins`에서 최근 7일 내 첫 미체크인 날짜를 자동 선택, 없으면 `"복구할 날짜가 없어요"` 표시
  - Outgoing: 복구 성공 후 → `navigate('/calendar', { state: { focusDate: string }, replace: true })`

---

### S4. 통계
- **Route**: `/stats`
- **Feature**: F5, F8
- **TDS 컴포넌트**: `Top`(타이틀 `"통계"`), `Tab`(`주간`/`월간`), `Card`, `Paragraph.Text`, `Chip`, `Spacing`
- **템플릿 컴포넌트**: `ScreenScaffold`, `SummaryHero`(CountUp), `Sparkline`, `MiniBar`, `AdSlot`, `FloatingTabBar`, `Asset.ContentIcon`
- **Layout 계약**:
  - `ScreenScaffold` > `Top` > `Tab` > `SummaryHero`(`data-testid="rate-hero"`, 달성률 % CountUp) > `Paragraph.Text`(`data-testid="rate-detail"`) > `Spacing size={16}` > `Card`(`data-testid="trend-card"`, 8주 추이 `Sparkline`) > `Spacing size={12}` > `Card`(`data-testid="weekday-card"`, 요일별 `MiniBar` 7개, 각 `data-testid="weekday-bar-{MON..SUN}"` + `data-value`) > `Spacing size={24}` > `AdSlot`
- **상태**:
  - Loading: `data-testid="stats-skeleton"`
  - Empty: 기록 0건 → `rate-hero` `0%` + `Asset.ContentIcon` + `"기록이 쌓이면 통계를 보여드릴게요"` (Sparkline/MiniBar 미마운트)
  - Error: 계산 예외 → `"통계를 계산하지 못했어요"` Card 1개, 앱은 크래시하지 않음
- **터치**: `Tab` 각 항목 ≥ 44px 높이
- **Navigation state contract**:
  - Incoming: 없음 (`location.state` 접근 금지)
  - Outgoing: 없음 (탭 이동은 `FloatingTabBar`가 처리)

---

### S5. 뱃지 컬렉션
- **Route**: `/badges`
- **Feature**: F6, F8
- **TDS 컴포넌트**: `Top`(뒤로가기 + 타이틀 `"뱃지"`), `Card`(획득 요약), `BottomSheet`(뱃지 상세), `ListRow`, `Chip`, `AlertDialog`(신규 획득 축하), `Spacing`
- **템플릿 컴포넌트**: `ScreenScaffold`, `AdSlot`, `Asset.ContentIcon`
- **Layout 계약**: 커스텀 CSS Grid `repeat(3, 1fr)` 허용. 각 셀 `data-testid="badge-{id}"` + `data-earned="true"|"false"`. 미획득 셀은 `opacity` 및 회색 계열 `var(--tds-color-*)` 적용.
- **상태**:
  - Loading: `data-testid="badges-skeleton"` 9셀
  - Empty: 획득 0개 → 상단 안내 `"첫 체크인으로 '첫 걸음' 뱃지를 받아보세요"`
  - Error: 저장 실패 → Toast `"뱃지 저장에 실패했어요. 잠시 후 다시 시도해주세요"`
- **스크롤**: 고정 9개 항목 → 가상 스크롤 불필요
- **터치**: 뱃지 셀 ≥ 88×88px
- **Navigation state contract**:
  - Incoming: `location.state = { highlightBadgeId?: BadgeId } | undefined` — 전달 시 해당 셀에 강조 테두리 적용
  - Outgoing: 없음

---

### S6. 랭킹
- **Route**: `/rank`
- **Feature**: F7, F8
- **TDS 컴포넌트**: `Top`(타이틀 `"랭킹"`), `ListRow`(순위 행 — `left`=순위, `contents`=닉네임, `right`=스트릭), `TextField`(초대 코드 입력), `Button`(참여/복사), `Card`(내 초대 코드), `BottomSheet`(닉네임 설정), `Chip`(오프라인 표시), `Toast`, `Spacing`
- **템플릿 컴포넌트**: `ScreenScaffold`, `SubmitFooter`, `FloatingTabBar`, `Asset.ContentIcon`
- **Layout 계약**:
  - 미참여 상태: `Card`(`data-testid="my-invite-card"`, 초대 코드 t2 강조 + `data-testid="copy-invite"` 버튼) > `Spacing size={16}` > `TextField`(`data-testid="join-input"`) > `SubmitFooter`의 `data-testid="join-submit"` `display="block"` 버튼
  - 참여 상태: 순위 `ListRow` 리스트, 본인 행 `data-me="true"`로 배경 강조
- **상태**:
  - Loading: `data-testid="rank-skeleton"` 5행
  - Empty: `roomCode === null` → `Asset.ContentIcon` + `"친구 코드를 입력하고 순위를 겨뤄보세요"`
  - Error: 404 → TextField 하단 `"존재하지 않는 초대 코드예요"` / 네트워크 실패 → 캐시 렌더 + `Chip` `"오프라인 · 마지막 갱신 결과"` / 500 → Toast `"잠시 후 다시 시도해주세요"`
- **스크롤**: 랭킹 항목 20건 초과 시 가상 스크롤(윈도잉, 화면 밖 항목 언마운트) 적용. 20건 이하는 일반 렌더.
- **키보드**: 초대 코드 `TextField`는 `inputMode="text"`, `autoCapitalize="characters"`, `maxLength={6}`, `enterKeyHint="done"`. 키보드 노출 시 `SubmitFooter`가 키보드 위로 이동.
- **터치**: `ListRow` 높이 ≥ 56px, 복사 버튼 ≥ 44px
- **Navigation state contract**:
  - Incoming: 없음
  - Outgoing: 없음 (외부 링크·`window.open` 사용 금지, 초대는 클립보드 복사만)

---

## API Contract

> 외부 API 서버(별도 Railway 배포)로의 호출만 정의한다. 내부 라우트는 포함하지 않는다.
> Base URL: `import.meta.env.VITE_RANK_API_BASE` (예: `https://zss-rank.up.railway.app`)
> 공통 헤더: `Content-Type: application/json`
> CORS: 서버는 `Access-Control-Allow-Origin`에 토스 미니앱 오리진을 허용해야 한다(F8 AC 대상).
> 타임아웃: 5,000ms. 초과 시 로컬 캐시 폴백.

### 공통 에러 응답 (모든 엔드포인트)
```ts
interface ApiError {
  error: string;
}
```

| HTTP | `error` 값 | 클라이언트 처리 |
|---|---|---|
| 400 | `"INVALID_PAYLOAD"` | Toast `"입력값을 확인해주세요"` |
| 404 | `"ROOM_NOT_FOUND"` | TextField 에러 `"존재하지 않는 초대 코드예요"` |
| 409 | `"NICKNAME_TAKEN"` | TextField 에러 `"이미 사용 중인 닉네임이에요"` |
| 429 | `"RATE_LIMITED"` | Toast `"잠시 후 다시 시도해주세요"` |
| 500 | `"INTERNAL_ERROR"` | Toast `"잠시 후 다시 시도해주세요"` |

---

### API-1. 스트릭 동기화
`POST /v1/sync`

Request:
```ts
interface SyncRequest {
  userId: string;        // Profile.deviceUserId (UUID v4)
  nickname: string;      // 2~10자
  roomCode: string;      // /^[A-Z0-9]{6}$/
  currentStreak: number; // >= 0 정수
  bestStreak: number;    // >= 0 정수
  totalDays: number;     // >= 0 정수
}
```

Response `200`:
```ts
interface SyncResponse {
  ok: true;
  syncedAt: number; // epoch ms
}
```

Errors: `400 INVALID_PAYLOAD`, `404 ROOM_NOT_FOUND`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`

---

### API-2. 랭킹방 참여
`POST /v1/rooms/join`

Request:
```ts
interface JoinRequest {
  userId: string;    // UUID v4
  nickname: string;  // 2~10자
  roomCode: string;  // /^[A-Z0-9]{6}$/ — 친구의 inviteCode
}
```

Response `200`:
```ts
interface JoinResponse {
  roomCode: string;
  memberCount: number; // 1 이상 정수
}
```

Errors: `400 INVALID_PAYLOAD`, `404 ROOM_NOT_FOUND`, `409 NICKNAME_TAKEN`, `500 INTERNAL_ERROR`

---

### API-3. 랭킹 조회
`GET /v1/rooms/{roomCode}/rank?limit=100`

Path/Query:
```ts
interface RankParams {
  roomCode: string; // /^[A-Z0-9]{6}$/
  limit: number;    // 1~100, 기본 100
}
```

Response `200`:
```ts
interface RankResponse {
  roomCode: string;
  updatedAt: number;    // epoch ms
  entries: RankEntry[]; // rank 오름차순 정렬 보장
}

interface RankEntry {
  userId: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  rank: number; // 1부터 시작
}
```

정렬 규칙: `currentStreak` DESC → `bestStreak` DESC → `totalDays` DESC → `nickname` ASC

Errors: `400 INVALID_PAYLOAD`, `404 ROOM_NOT_FOUND`, `429 RATE_LIMITED`, `500 INTERNAL_ERROR`

---

## Assumptions

1. **A1**: 토스 앱이 사용자 세션을 자동 제공하므로 로그인 UI/함수 호출은 구현하지 않는다. 랭킹 식별자는 `deviceUserId`(로컬 UUID v4)를 사용하며, 기기 변경 시 기록은 이관되지 않는다.
2. **A2**: 사용자는 "지출 0원"을 스스로 판단해 체크인한다. 실제 계좌·카드 거래 내역 연동은 MVP 범위 밖이다.
3. **A3**: 모든 날짜 연산은 KST 고정. 해외 체류 사용자도 KST 기준으로 하루가 바뀐다.
4. **A4**: 스트릭 판정은 "어제 또는 오늘 체크인이 있으면 유지"이며, 이틀 연속 미체크인 시 0으로 초기화된다.
5. **A5**: 복구권은 최근 7일 이내 미체크인 날짜만 대상으로 하며, 일일 획득 1개·최대 보유 3개다.
6. **A6**: 랭킹 서버는 별도 Railway 인스턴스로 배포되며 본 SPEC 범위에는 서버 구현이 포함되지 않는다. 서버 미가용 시 앱은 로컬 전용 모드로 완전히 동작한다(F1~F6 전 기능 정상).
7. **A7**: 배너 광고는 `VITE_TOSS_AD_GROUP_ID`, 리워드 광고는 `VITE_TOSS_AD_SLOT_ID` 환경변수로 앱인토스 콘솔 값을 주입받는다(재빌드 없이 교체 가능).
8. **A8**: 본 앱은 생성형 AI를 사용하지 않으므로 AI 고지 의무 요건은 적용되지 않는다.
9. **A9**: `grantPromotionReward`는 MVP에서 사용하지 않는다(PRD에 프로모션 캠페인 없음). 도입 시 `amount ≤ 5000` 검증을 필수로 추가한다.
10. **A10**: 예상 데이터 총량 약 89KB로 localStorage 5MB 한도 대비 충분한 여유가 있어 데이터 정리(purge) 기능은 MVP 범위 밖이다.

---

## Open Questions

| ID | 질문 | 영향 범위 | 임시 결정 |
|---|---|---|---|
| **OQ-1** | 랭킹용 외부 API 서버를 실제로 배포할 것인가, MVP는 로컬 전용(초대 코드 복사 + 수동 비교)으로 낼 것인가? | F7 전체, API Contract | 서버 없이도 앱이 완전 동작하도록 구현하고, `VITE_RANK_API_BASE`가 비어 있으면 F7을 "초대 코드 카드만 노출"로 축소 렌더한다 |
| **OQ-2** | 복구권 일일 획득 상한 1개·최대 보유 3개가 광고 수익 목표($321 MRR)에 충분한가? | F4 | 1개/3개로 시작하고 지표 확인 후 조정 |
| **OQ-3** | 스트릭 유지 판정에서 "오늘 미체크인 상태"를 유예로 볼지 여부 — 현재는 어제 체크인이 있으면 유지로 처리 | F1 AC-2 | 유예 유지(사용자 이탈 방지) |
| **OQ-4** | 향후 "이번 주 절약 코멘트" 등 생성형 AI 기능을 도입할 것인가? | 전역 컴플라이언스 | MVP 미포함. 도입 시 AI 사전 고지 다이얼로그 + 결과물 라벨 AC를 반드시 추가 |
| **OQ-5** | 닉네임 중복 정책 — 방 내 유일 vs 전역 유일? | API-2 `409 NICKNAME_TAKEN` | 방 내 유일로 가정 |
| **OQ-6** | 체크인 리마인더가 없는 상태(푸시 알림 미지원)에서 리텐션이 확보되는가? | 전체 리텐션 | MVP는 푸시 없이 출시, 재방문율 측정 후 검토 |