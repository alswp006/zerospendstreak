# SPEC — ZeroSpendStreak

> 하루 지출 0원에 도전하고 연속 성공일수를 기록하며 친구와 순위를 겨루는 무지출 챌린지 스트릭 앱
> Platform: 앱인토스 (Vite + React + TypeScript + TDS + React Router + localStorage)

---

## Common Principles

### CP-1. 기술 스택 고정
- UI는 전부 `@toss/tds-mobile` 컴포넌트로 조립한다. shadcn/ui, MUI, Ant Design, Chakra UI 사용 금지.
- 간격은 TDS `Spacing`(size prop 필수)으로만 조절한다. TDS 컴포넌트에 Tailwind/인라인 style로 padding·margin을 덮어쓰지 않는다.
- 커스텀 CSS는 TDS가 제공하지 않는 레이아웃(flex/grid 배치)에만 허용한다.
- 색상은 `var(--tds-color-*)` CSS 변수 또는 TDS 컴포넌트 기본값만 사용한다. HEX 하드코딩 금지(다크모드 필수 지원).
- 라우팅은 `react-router-dom` (`BrowserRouter`). 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 사용(TDS에는 TabBar 없음). TDS `Tab`은 화면 내부 콘텐츠 전환에만 사용.

### CP-2. 인증 / 사용자 식별
- 토스 앱이 세션을 자동 제공한다. 로그인 함수 호출·커스텀 인증 구현 금지.
- 친구 랭킹(F7)에서 사용자 식별이 필요할 때만 `getIsTossLoginIntegratedService()`로 연동 여부를 확인한다. `false`이면 랭킹 기능을 잠금 상태로 표시하고 로컬 기능(F1~F6)은 정상 동작한다.

### CP-3. 날짜 기준
- 모든 날짜 키는 KST(UTC+9) 기준 `YYYY-MM-DD` 문자열(`DateKey`)이다.
- 단일 유틸 `getTodayKey(now: Date = new Date()): DateKey`만 사용한다. 화면/스토어에서 개별 날짜 계산 금지.
- 하루 경계는 KST 00:00:00이다. 23:59:59 체크인은 그날, 00:00:00 체크인은 다음 날로 기록된다.

### CP-4. 데이터 영속성
- 모든 상태는 `localStorage`에 저장한다(템플릿 제공 storage helper 사용). 서버 사이드 코드 없음.
- 랭킹(F7)만 외부 API 서버(별도 Railway 배포)와 통신한다. 그 외 기능은 전부 오프라인 동작한다.
- 모든 키는 `zss:` prefix + `:v{n}` suffix. 스키마 버전 불일치 시 마이그레이션 후 저장.
- 쓰기 실패(`QuotaExceededError`)는 항상 catch하여 Toast로 처리하고 앱을 크래시시키지 않는다.

### CP-5. 모바일 UX
- 모든 인터랙티브 요소의 터치 타깃은 최소 44x44px.
- 모든 화면은 템플릿 `ScreenScaffold`로 감싼다(raw div 골격 금지).
- 1차 액션은 `SubmitFooter`(하단 고정) 또는 `display="block"` 버튼. 좌측 글자폭 버튼 금지.
- 핵심 정보(스트릭/통계/랭킹)는 TDS `Card`로 묶어 위계를 표현한다. 맨 div 나열 금지.
- 리스트가 50개를 넘으면 가상 스크롤 또는 페이지네이션(20개 단위 "더 보기")을 적용한다.

### CP-6. 광고
- 배너: 템플릿 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`. 콘텐츠 섹션 사이 또는 결과 하단에만 배치하며 콘텐츠를 겹치지 않는다.
- 보상형: 템플릿 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>{children}</TossRewardAd>`. 스트릭 복구권 획득(F5)에만 사용.
- `useTossAd` 훅, `loadAdMob/showAdMob`은 존재하지 않으므로 사용 금지.

### CP-7. 검수 컴플라이언스 (F8에서 일괄 검증)
- 외부 도메인 이탈 금지, 앱 설치 유도 문구 금지, 외부 분석 솔루션(GA/Amplitude) 금지, 프로덕션 콘솔 에러 0개, Android 7+/iOS 16+ 호환.
- 본 앱은 생성형 AI를 사용하지 않으므로 AI 고지 의무 대상이 아니다(Assumptions A-6 참조).

---

## Data Models

### DateKey
```ts
/** KST 기준 'YYYY-MM-DD' */
type DateKey = string;
```

### CheckIn
| field | type | constraints |
|---|---|---|
| date | `DateKey` | PK. 하루 1건. `getTodayKey()` 결과와 동일해야 저장 가능(복구 삽입 제외) |
| source | `'manual' \| 'recovery'` | 사용자 체크인 vs 광고 복구권으로 삽입 |
| createdAt | `number` | epoch ms |
| memo | `string` | 0~30자. 빈 문자열 허용 |

```ts
export interface CheckIn {
  date: DateKey;
  source: 'manual' | 'recovery';
  createdAt: number;
  memo: string;
}
export interface CheckInStore {
  version: 1;
  items: Record<DateKey, CheckIn>;
}
```
- key: `zss:checkins:v1`
- shape: `CheckInStore`
- size: 1건 ≈ 90 bytes(JSON) → 3년(1,095건) ≈ 99KB

### StreakState (파생값, 캐시 저장)
```ts
export interface StreakState {
  version: 1;
  current: number;        // 오늘 기준 연속 일수 (0 이상)
  best: number;           // 역대 최고 연속 일수
  lastCheckInDate: DateKey | null;
  brokenAt: DateKey | null; // 스트릭이 끊긴 날(미체크인 날짜) — 복구 대상
  updatedAt: number;
}
```
- key: `zss:streak:v1`
- size ≈ 140 bytes
- **불변식**: `current`/`best`는 항상 `CheckInStore`로부터 재계산 가능해야 한다. 캐시와 재계산 결과가 다르면 재계산 결과를 정본으로 덮어쓴다.

### RecoveryState
```ts
export interface RecoveryState {
  version: 1;
  tickets: number;             // 보유 복구권 (0~2)
  usedDates: DateKey[];        // 복구권으로 메운 날짜들
  grantedAtByDay: Record<DateKey, number>; // 날짜별 광고 시청 획득 횟수
  weekKey: string;             // 'YYYY-Www' (ISO week, KST)
  weeklyGrantCount: number;    // 해당 주 획득 횟수 (0~2)
}
```
- key: `zss:recovery:v1`
- size ≈ 300 bytes

### Badge
```ts
export type BadgeId = 'D3' | 'D7' | 'D14' | 'D30' | 'D50' | 'D100' | 'TOTAL30' | 'PERFECT_WEEK';
export interface BadgeRecord {
  id: BadgeId;
  unlockedAt: number;   // epoch ms
  seen: boolean;        // 획득 애니메이션 노출 여부
}
export interface BadgeStore {
  version: 1;
  items: Record<BadgeId, BadgeRecord>;
}
```
- key: `zss:badges:v1`
- size ≈ 8건 × 70 bytes ≈ 560 bytes

**뱃지 해금 규칙(고정 테이블)**

| id | 조건 | 라벨 |
|---|---|---|
| D3 | `current >= 3` | 3일 연속 |
| D7 | `current >= 7` | 일주일 완주 |
| D14 | `current >= 14` | 2주 완주 |
| D30 | `current >= 30` | 한 달 완주 |
| D50 | `current >= 50` | 50일 완주 |
| D100 | `current >= 100` | 100일 완주 |
| TOTAL30 | 누적 체크인 30건 이상 | 누적 30일 |
| PERFECT_WEEK | 월~일 7일 전부 체크인된 주가 1회 이상 | 퍼펙트 위크 |

### FriendGroup (F7)
```ts
export interface FriendGroup {
  version: 1;
  groupCode: string | null;   // 6자리 대문자+숫자, 예: 'A7K2QX'
  nickname: string;           // 1~10자
  memberId: string | null;    // 서버 발급 UUID
  joinedAt: number | null;
}
export interface RankingEntry {
  memberId: string;
  nickname: string;
  currentStreak: number;
  bestStreak: number;
  rank: number;               // 1부터, 동점은 같은 rank
  isMe: boolean;
}
```
- key: `zss:friendGroup:v1` (`FriendGroup`), `zss:rankingCache:v1` (`{ version: 1; entries: RankingEntry[]; fetchedAt: number }`)
- size: 그룹 ≈ 160 bytes, 랭킹 캐시 최대 50명 × 120 bytes ≈ 6KB

### AppFlags
```ts
export interface AppFlags {
  version: 1;
  onboardingSeen: boolean;
  lastOpenedDate: DateKey | null;
}
```
- key: `zss:flags:v1`
- size ≈ 90 bytes

**총 용량 추정: ≈ 106KB (5MB 한도의 2.1%)**

---

## Feature List

### F1. 체크인 데이터 레이어 & 스트릭 엔진

- **Description**: 체크인 저장/조회, 스트릭 계산, 뱃지 판정, localStorage 읽기·쓰기·마이그레이션을 담당하는 순수 로직 레이어다. UI를 포함하지 않으며 모든 화면이 이 레이어의 함수만 호출한다. 스트릭 값은 항상 `CheckInStore`에서 재계산 가능한 파생값으로 취급한다.
- **Data**: `CheckInStore`, `StreakState`, `BadgeStore`, `AppFlags`
- **API**: 없음 (로컬 전용)
- **Requirements**:
  - `addCheckIn(memo: string): { ok: true; streak: StreakState } | { ok: false; reason: 'ALREADY_CHECKED' | 'STORAGE_FULL' }`
  - `computeStreak(items: Record<DateKey, CheckIn>, today: DateKey): StreakState`
  - `evaluateBadges(streak: StreakState, items: Record<DateKey, CheckIn>): BadgeId[]` (신규 해금분만 반환)

- **AC-1 [E][P0]**: Scenario: 오늘 첫 체크인 저장
  - Given `zss:checkins:v1`이 `{ version: 1, items: {} }`이고 오늘이 `2026-08-19`일 때
  - When `addCheckIn("커피 참았다")` 호출
  - Then `zss:checkins:v1.items["2026-08-19"]`가 `{ date: "2026-08-19", source: "manual", memo: "커피 참았다" }`로 저장됨
  - And 반환값이 `{ ok: true, streak: { current: 1, best: 1, lastCheckInDate: "2026-08-19" } }`임

- **AC-2 [U][P0]**: The system shall `computeStreak`에서 오늘 또는 어제까지 연속된 날짜만 `current`로 계산한다.
  - Given `items` 키가 `["2026-08-16","2026-08-17","2026-08-18"]`이고 today가 `2026-08-19`일 때
  - Then `current === 3`, `best === 3`, `brokenAt === null` (오늘 미체크인이지만 어제까지 연속이므로 유지)

- **AC-3 [S][P0]**: Scenario: 하루 건너뛰면 스트릭 초기화
  - Given `items` 키가 `["2026-08-15","2026-08-16"]`이고 today가 `2026-08-19`일 때
  - When `computeStreak` 호출
  - Then `current === 0`, `best === 2`, `brokenAt === "2026-08-17"` (끊긴 첫 날짜)

- **AC-4 [W][P0]**: Scenario: 같은 날 중복 체크인 거부
  - Given `items["2026-08-19"]`가 이미 존재할 때
  - When `addCheckIn("또 체크")` 호출
  - Then 반환값이 `{ ok: false, reason: "ALREADY_CHECKED" }`이고 `items["2026-08-19"].memo`는 변경되지 않음

- **AC-5 [W][P1]**: Scenario: localStorage 용량 초과
  - Given `localStorage.setItem`이 `QuotaExceededError`를 throw할 때
  - When `addCheckIn("메모")` 호출
  - Then 예외를 catch하여 `{ ok: false, reason: "STORAGE_FULL" }`을 반환하고 `console.error`를 호출하지 않음
  - And 메모리 상태는 롤백되어 저장 전 값과 동일함

- **AC-6 [W][P1]**: Scenario: 손상된 JSON 복구
  - Given `localStorage["zss:checkins:v1"]` 값이 `"{broken"` 일 때
  - When 앱 초기화 시 스토어를 읽음
  - Then 파싱 실패를 catch하고 `{ version: 1, items: {} }`로 초기화하여 저장하며 앱이 크래시하지 않음

- **AC-7 [E][P0]**: Scenario: 뱃지 해금 판정
  - Given `badges.items`가 `{}`이고 `streak.current === 7`일 때
  - When `evaluateBadges` 호출
  - Then 반환 배열이 `["D3","D7"]`이고 `zss:badges:v1`에 두 건이 `seen: false`로 저장됨

- **AC-8 [U][P1]**: The system shall 스토어 로딩 중(`status === 'loading'`) 화면에 TDS `Skeleton`을 노출하고 로딩 완료 전에는 체크인 버튼을 `disabled`로 유지한다.

---

### F2. 홈 — 오늘 무지출 체크인

- **Description**: 앱의 첫 화면으로 오늘 무지출 성공 여부를 한 번의 탭으로 기록한다. 현재 연속 일수를 히어로 숫자로 강조하고, 오늘 체크인 완료 여부에 따라 CTA 상태가 바뀐다. 메모는 선택 입력(최대 30자)이다.
- **Data**: `CheckInStore`, `StreakState`, `AppFlags`
- **API**: 없음
- **Requirements**: 홈 라우트 `/`, 체크인 CTA, 메모 입력 BottomSheet, 스트릭 히어로, 배너 광고.

- **AC-1 [E][P0]**: Scenario: 체크인 성공
  - Given 오늘 `2026-08-19` 체크인 기록이 없고 `current === 4`일 때
  - When `data-testid="checkin-cta"` 버튼 탭 → BottomSheet에서 메모 `"배달 안 시킴"` 입력 후 "기록하기" 탭
  - Then localStorage에 체크인이 저장되고 TDS Toast `"오늘도 0원! 5일 연속 성공"`이 표시됨
  - And `data-testid="streak-hero"` 값이 `4`에서 `5`로 CountUp 애니메이션됨

- **AC-2 [S][P0]**: Scenario: 이미 체크인한 상태
  - Given `items["2026-08-19"]`가 존재할 때
  - When 홈 화면 진입
  - Then `data-testid="checkin-cta"` 버튼이 `disabled` 상태이고 라벨이 `"오늘 체크인 완료"`임
  - And `data-testid="checkin-done-badge"` 배지에 `"오늘 완료"` 텍스트가 표시됨

- **AC-3 [U][P0]**: 홈 화면은 `ScreenScaffold`로 감싸고, `data-testid="streak-hero"`인 `SummaryHero`(value=현재 연속일수, CountUp)와 `data-testid="streak-card"` Card 1개를 가지며, 체크인 CTA는 `SubmitFooter` 안에 `display="block"`으로 렌더된다.

- **AC-4 [W][P1]**: Scenario: 메모 길이 초과
  - Given 메모 BottomSheet가 열려 있을 때
  - When 31자 문자열 `"a".repeat(31)` 입력 시도
  - Then TextField 값이 30자에서 잘리고 헬퍼 텍스트 `"메모는 30자까지 입력할 수 있어요"`가 표시됨

- **AC-5 [W][P1]**: Scenario: 저장 실패 처리
  - Given `addCheckIn`이 `{ ok: false, reason: "STORAGE_FULL" }`을 반환할 때
  - When "기록하기" 탭
  - Then TDS Toast `"저장 공간이 부족해요. 앱 데이터를 정리해주세요"`가 표시되고 BottomSheet는 열린 상태를 유지함

- **AC-6 [S][P1]**: Scenario: 최초 진입 빈 상태
  - Given 체크인 기록이 0건일 때
  - When 홈 진입
  - Then `data-testid="streak-hero"` 값이 `0`이고 `Asset.ContentIcon`과 함께 `"첫 무지출 데이를 기록해보세요"` 문구가 표시됨

- **AC-7 [U][P1]**: The system shall 메모 TextField 포커스 시 모바일 키보드가 입력 필드를 가리지 않도록 BottomSheet를 키보드 높이만큼 상단으로 이동시키고, `enterKeyHint="done"`을 지정하며 Enter 입력 시 폼을 제출한다.

- **AC-8 [U][P2]**: 홈 화면 배너 광고 `<AdSlot />`은 스트릭 카드와 최근 7일 요약 섹션 **사이**에 렌더되며 `SubmitFooter`와 겹치지 않는다.

---

### F3. 스트릭 캘린더 시각화

- **Description**: 월 단위 캘린더 그리드로 체크인 성공일/실패일/복구일을 색상으로 구분해 보여준다. 좌우 화살표로 월을 이동하며, 미래 날짜는 비활성 상태로 표시한다. 각 날짜 셀을 탭하면 해당 날짜의 메모를 BottomSheet로 확인할 수 있다.
- **Data**: `CheckInStore`, `StreakState`
- **API**: 없음
- **Requirements**: 라우트 `/streak`, 월 이동, 날짜 상태 4종(success/recovery/miss/future).

- **AC-1 [U][P0]**: `/streak` 화면은 `data-testid="calendar-grid"` 요소를 가지며, 해당 월의 일수만큼 `data-testid="cell-{YYYY-MM-DD}"` 셀을 렌더한다.
  - Given 2026년 8월을 보고 있을 때
  - Then `cell-2026-08-01` ~ `cell-2026-08-31` 총 31개 셀이 존재함

- **AC-2 [U][P0]**: 각 셀은 `data-state` 속성을 가진다: 체크인 존재 & `source==='manual'` → `"success"`, `source==='recovery'` → `"recovery"`, 과거 날짜 & 체크인 없음 → `"miss"`, 오늘 이후 → `"future"`.

- **AC-3 [E][P0]**: Scenario: 이전 달 이동
  - Given 2026년 8월을 보고 있을 때
  - When `data-testid="calendar-prev"` 버튼 탭
  - Then 헤더 텍스트가 `"2026년 7월"`로 바뀌고 31개 셀이 렌더됨

- **AC-4 [E][P1]**: Scenario: 날짜 메모 확인
  - Given `2026-08-18`에 memo `"편의점 참기"`인 체크인이 있을 때
  - When `cell-2026-08-18` 탭
  - Then BottomSheet가 열리고 `"2026년 8월 18일"`과 `"편의점 참기"`가 표시됨

- **AC-5 [W][P1]**: Scenario: 미래 날짜 탭 차단
  - Given 오늘이 `2026-08-19`일 때
  - When `cell-2026-08-25` 탭
  - Then BottomSheet가 열리지 않고 아무 상태 변화가 없음

- **AC-6 [W][P1]**: Scenario: 미래 달로 이동 차단
  - Given 오늘이 `2026-08-19`이고 2026년 8월을 보고 있을 때
  - Then `data-testid="calendar-next"` 버튼이 `disabled` 상태임

- **AC-7 [S][P1]**: Scenario: 기록 없는 달
  - Given 2026년 7월에 체크인이 0건일 때
  - When 해당 월로 이동
  - Then 캘린더 하단에 `Asset.ContentIcon`과 `"이 달에는 기록이 없어요"` 문구가 표시됨

- **AC-8 [U][P1]**: 모든 캘린더 셀의 터치 타깃은 44x44px 이상이며, 캘린더 그리드는 커스텀 CSS grid(7열)로 배치하고 셀 내부 텍스트는 TDS `Paragraph.Text`를 사용한다.

---

### F4. 주간/월간 달성률 통계

- **Description**: 최근 7일·이번 달 무지출 달성률을 카드로 제공하고, 최근 8주 추이를 Sparkline으로, 요일별 성공 비율을 MiniBar로 시각화한다. 모든 수치는 로컬 체크인 데이터에서 계산하며 서버 호출이 없다.
- **Data**: `CheckInStore`, `StreakState`
- **API**: 없음
- **Requirements**: 라우트 `/stats`, 주간 카드, 월간 카드, 추이 Sparkline, 요일별 MiniBar, 배너 광고.

- **AC-1 [U][P0]**: `/stats` 화면은 `ScreenScaffold` 안에 `data-testid="stat-weekly-card"`와 `data-testid="stat-monthly-card"` Card 2개를 가지며, 각 Card의 핵심 값(달성률 %)은 t2 타이포로 강조된다.

- **AC-2 [E][P0]**: Scenario: 주간 달성률 계산
  - Given 오늘이 `2026-08-19`이고 최근 7일(`08-13`~`08-19`) 중 `08-14, 08-16, 08-17, 08-19` 4일에 체크인이 있을 때
  - When `/stats` 진입
  - Then `data-testid="weekly-rate"` 텍스트가 `"57%"`(반올림)이고 보조 텍스트가 `"7일 중 4일"`임

- **AC-3 [E][P0]**: Scenario: 월간 달성률 계산
  - Given 오늘이 `2026-08-19`이고 8월 1일~19일 중 10일에 체크인이 있을 때
  - Then `data-testid="monthly-rate"` 텍스트가 `"53%"`이고 보조 텍스트가 `"19일 중 10일"`임 (분모는 경과일수, 말일 아님)

- **AC-4 [U][P1]**: `data-testid="weekly-trend-sparkline"` Sparkline은 최근 8주의 주별 성공일수(0~7) 8개 포인트를 렌더하고, `data-testid="weekday-minibar"` MiniBar는 월~일 7개 바로 요일별 성공 비율(0~100)을 렌더한다.

- **AC-5 [S][P1]**: Scenario: 데이터 부족 빈 상태
  - Given 전체 체크인이 0건일 때
  - When `/stats` 진입
  - Then Sparkline/MiniBar 대신 `Asset.ContentIcon`과 `"기록이 쌓이면 통계를 보여드려요"`가 표시되고 `weekly-rate`는 `"0%"`임

- **AC-6 [W][P1]**: Scenario: 계산 예외 방어
  - Given `items`에 `"2026-13-45"` 같은 잘못된 DateKey가 섞여 있을 때
  - When 통계 계산
  - Then 해당 항목은 무시되고 나머지로 계산되며 화면이 흰 화면으로 깨지지 않음

- **AC-7 [U][P1]**: The system shall 통계 계산이 완료되기 전 각 Card 자리에 TDS `Skeleton`을 렌더하고, 계산은 `useMemo`로 1회만 수행한다.

- **AC-8 [U][P2]**: `<AdSlot />`은 월간 카드와 요일별 MiniBar 섹션 **사이**에 1개만 배치하며 차트 위에 겹치지 않는다.

---

### F5. 스트릭 복구 (리워드 광고 게이트)

- **Description**: 하루를 놓쳐 스트릭이 끊긴 경우, 리워드 광고를 끝까지 시청하면 복구권 1개를 획득해 끊긴 날짜 1일을 메울 수 있다. 복구는 하루 1회, 한 주(월~일) 최대 2회로 제한하며 끊긴 지 2일 이내인 경우만 가능하다. 복구된 날짜는 캘린더에서 `recovery` 상태로 구분 표시된다.
- **Data**: `RecoveryState`, `CheckInStore`, `StreakState`
- **API**: 없음 (`TossRewardAd` 사용)
- **Requirements**: 홈 상단 복구 카드, `TossRewardAd` 게이트, 복구 적용 로직.

- **AC-1 [S][P0]**: Scenario: 복구 카드 노출 조건
  - Given `streak.brokenAt === "2026-08-18"`이고 오늘이 `2026-08-19`일 때
  - When 홈 진입
  - Then `data-testid="recovery-card"` Card가 스트릭 히어로 바로 아래 표시되고 본문에 `"8월 18일 하루가 비었어요. 광고 보고 스트릭을 살릴 수 있어요"`가 표시됨

- **AC-2 [E][P0]**: Scenario: 광고 시청 후 복구 성공
  - Given `recovery.tickets === 0`, `brokenAt === "2026-08-18"`, `best === 6`일 때
  - When `data-testid="recovery-cta"` 탭 → `TossRewardAd` 시청 완료 콜백 발생
  - Then `items["2026-08-18"]`가 `{ source: "recovery", memo: "" }`로 삽입되고 `recovery.tickets === 0`, `weeklyGrantCount`가 1 증가함
  - And Toast `"스트릭을 살렸어요!"`가 표시되고 `streak-hero` 값이 재계산되어 갱신됨

- **AC-3 [W][P0]**: Scenario: 주간 복구 한도 초과
  - Given `recovery.weeklyGrantCount === 2`이고 `weekKey`가 이번 주일 때
  - When 홈 진입
  - Then `data-testid="recovery-cta"`가 `disabled`이고 라벨이 `"이번 주 복구 횟수를 다 썼어요 (2/2)"`임

- **AC-4 [W][P0]**: Scenario: 복구 가능 기한 초과
  - Given `brokenAt === "2026-08-10"`이고 오늘이 `2026-08-19`일 때 (2일 초과)
  - When 홈 진입
  - Then `data-testid="recovery-card"`가 렌더되지 않음

- **AC-5 [W][P1]**: Scenario: 광고 시청 중도 이탈
  - Given 사용자가 `data-testid="recovery-cta"`를 탭해 광고가 재생 중일 때
  - When 광고를 끝까지 보지 않고 닫음 (완료 콜백 미발생)
  - Then 체크인이 삽입되지 않고 `weeklyGrantCount`가 증가하지 않으며 Toast `"광고를 끝까지 봐야 복구할 수 있어요"`가 표시됨

- **AC-6 [W][P1]**: Scenario: 광고 로드 실패
  - Given `TossRewardAd`가 로드 에러를 반환할 때
  - When `recovery-cta` 탭
  - Then Toast `"지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요"`가 표시되고 버튼이 다시 활성화됨

- **AC-7 [S][P1]**: While 광고 로딩 중, the system shall `recovery-cta` 버튼을 `loading` 상태로 표시하고 중복 탭을 무시한다(연타 3회 시 광고 1회만 요청).

- **AC-8 [E][P0]**: Scenario: 주 경계 카운터 리셋
  - Given `recovery.weekKey === "2026-W33"`, `weeklyGrantCount === 2`이고 오늘이 `2026-W34`에 속할 때
  - When 홈 진입
  - Then `weekKey`가 `"2026-W34"`로 갱신되고 `weeklyGrantCount === 0`으로 초기화됨

---

### F6. 마일스톤 뱃지 수집

- **Description**: 연속 일수·누적 일수·퍼펙트 위크 달성 시 뱃지를 해금하고 컬렉션 화면에서 획득/미획득을 구분해 보여준다. 새로 해금된 뱃지는 최초 1회 AlertDialog로 축하 안내를 노출한다. 뱃지 규칙은 F1의 고정 테이블을 따른다.
- **Data**: `BadgeStore`, `StreakState`, `CheckInStore`
- **API**: 없음
- **Requirements**: 라우트 `/badges`, 8종 뱃지 그리드, 해금 축하 다이얼로그.

- **AC-1 [U][P0]**: `/badges` 화면은 `data-testid="badge-grid"` 안에 `data-testid="badge-{id}"` 카드 8개(D3, D7, D14, D30, D50, D100, TOTAL30, PERFECT_WEEK)를 항상 렌더한다.

- **AC-2 [U][P0]**: 각 뱃지 카드는 `data-unlocked` 속성을 가지며 해금 시 `"true"`, 미해금 시 `"false"`이고, 미해금 카드는 opacity 축소 + 조건 텍스트(예: `"3일 연속 달성 시 획득"`)를 표시한다.

- **AC-3 [E][P0]**: Scenario: 신규 해금 축하 다이얼로그
  - Given 체크인 후 `evaluateBadges`가 `["D7"]`을 반환했을 때
  - When 홈 화면에서 결과 처리
  - Then TDS `AlertDialog`가 열리고 제목 `"일주일 완주 뱃지 획득!"`이 표시됨
  - And "확인" 탭 시 `badges.items.D7.seen`이 `true`로 저장되고 다이얼로그가 닫힘

- **AC-4 [W][P0]**: Scenario: 동일 뱃지 재노출 방지
  - Given `badges.items.D7.seen === true`일 때
  - When 다음 날 체크인하여 `current === 8`이 됨
  - Then D7 축하 다이얼로그가 다시 열리지 않고 `unlockedAt` 값이 변경되지 않음

- **AC-5 [E][P1]**: Scenario: 다중 해금 순차 처리
  - Given `evaluateBadges`가 `["D3","D7"]`을 반환했을 때
  - Then D3 다이얼로그를 먼저 표시하고, 확인 탭 후 D7 다이얼로그를 표시한다(동시 표시 금지)

- **AC-6 [S][P1]**: Scenario: 전체 미획득 빈 상태
  - Given 해금된 뱃지가 0개일 때
  - When `/badges` 진입
  - Then 상단에 `Asset.ContentIcon`과 `"아직 획득한 뱃지가 없어요. 3일 연속이면 첫 뱃지!"`가 표시되고 그리드 8칸은 전부 `data-unlocked="false"`임

- **AC-7 [W][P1]**: Scenario: 뱃지 스토어 손상
  - Given `localStorage["zss:badges:v1"]`가 `"null"`일 때
  - When `/badges` 진입
  - Then `{ version: 1, items: {} }`로 초기화되고 체크인 데이터 기준으로 재판정하여 그리드를 렌더하며 콘솔 에러가 발생하지 않음

- **AC-8 [U][P1]**: 뱃지 카드는 커스텀 CSS grid(2열)로 배치하고 각 카드는 TDS `Card` + `Paragraph.Text`로 구성하며, 카드 터치 타깃은 44x44px 이상이다.

---

### F7. 친구 그룹 & 랭킹

- **Description**: 6자리 그룹 코드로 친구 그룹을 만들거나 참여해 서로의 현재 스트릭을 순위로 비교한다. 랭킹 데이터는 외부 API 서버(별도 Railway 배포)에 저장되며, 체크인 시 및 랭킹 화면 진입 시 내 스트릭을 서버에 동기화한다. 토스 로그인 연동이 비활성인 환경에서는 잠금 상태로 표시한다.
- **Data**: `FriendGroup`, `RankingEntry`, `zss:rankingCache:v1`
- **API**:
  - `POST {VITE_API_BASE_URL}/v1/groups` `{ nickname: string }` → `{ groupCode: string; memberId: string }` | 400,429,500
  - `POST {VITE_API_BASE_URL}/v1/groups/join` `{ groupCode: string; nickname: string }` → `{ memberId: string; groupCode: string }` | 400,404,409,500
  - `PUT {VITE_API_BASE_URL}/v1/members/{memberId}/streak` `{ currentStreak: number; bestStreak: number }` → `{ ok: true }` | 400,404,500
  - `GET {VITE_API_BASE_URL}/v1/groups/{groupCode}/ranking` → `{ entries: RankingEntry[] }` | 404,500
- **Requirements**: 라우트 `/ranking`, 그룹 생성/참여 BottomSheet, 랭킹 리스트, 코드 복사(외부 이동 없음).

- **AC-1 [E][P0]**: Scenario: 그룹 생성
  - Given `friendGroup.groupCode === null`일 때
  - When 닉네임 `"짠순이"` 입력 후 `data-testid="create-group"` 탭하고 서버가 `{ groupCode: "A7K2QX", memberId: "uuid-1" }`을 반환
  - Then `zss:friendGroup:v1`에 `{ groupCode: "A7K2QX", nickname: "짠순이", memberId: "uuid-1" }`이 저장되고 랭킹 리스트에 본인 1명(`rank: 1`, `isMe: true`)이 표시됨

- **AC-2 [E][P0]**: Scenario: 랭킹 조회 및 정렬
  - Given `groupCode === "A7K2QX"`일 때
  - When `/ranking` 진입하여 서버가 `entries: [{nickname:"짠돌이",currentStreak:12,rank:1},{nickname:"짠순이",currentStreak:5,rank:2,isMe:true}]` 반환
  - Then `data-testid="ranking-list"` 안에 TDS `ListRow` 2개가 순서대로 렌더되고 `isMe: true` 행에 `data-testid="ranking-me"` 속성이 부여됨

- **AC-3 [U][P0]**: `/ranking` 화면은 `data-testid="my-rank-card"` Card 1개를 상단에 가지며, 내 등수를 `SummaryHero`(CountUp, 예: `2위`)로 강조하고 그 아래 `ranking-list`를 배치한다.

- **AC-4 [W][P1]**: Scenario: 존재하지 않는 그룹 코드
  - Given 참여 BottomSheet에서 코드 `"ZZZZZZ"` 입력
  - When 서버가 404 `{ error: "GROUP_NOT_FOUND" }` 반환
  - Then 에러 메시지 `"존재하지 않는 코드예요"`가 TextField 하단에 표시되고 localStorage는 변경되지 않음

- **AC-5 [W][P1]**: Scenario: 네트워크 실패 시 캐시 표시
  - Given `zss:rankingCache:v1`에 5분 전 조회한 2건이 있고 fetch가 `TypeError: Failed to fetch`로 실패할 때
  - When `/ranking` 진입
  - Then 캐시된 2건을 렌더하고 상단에 `"오프라인 상태예요. 마지막 순위를 보여드려요"` 문구를 표시하며 앱이 크래시하지 않음

- **AC-6 [S][P1]**: While 랭킹 요청이 진행 중, the system shall `ranking-list` 자리에 TDS `Skeleton` 행 3개를 렌더하고 새로고침 버튼을 `disabled`로 유지한다.

- **AC-7 [S][P1]**: Scenario: 그룹 미참여 빈 상태
  - Given `friendGroup.groupCode === null`일 때
  - When `/ranking` 진입
  - Then `Asset.ContentIcon`과 `"친구와 함께 겨뤄보세요"` 문구, 그리고 `SubmitFooter`에 "그룹 만들기" / "코드로 참여" 버튼 2개가 표시됨

- **AC-8 [W][P0]**: Scenario: 초대 코드 공유 시 외부 이탈 금지
  - Given 랭킹 화면에서 `data-testid="copy-code"` 탭
  - Then 코드 문자열이 클립보드에 복사되고 Toast `"코드를 복사했어요"`가 표시됨
  - And `window.open` / `window.location.href`를 통한 외부 도메인 이동이 발생하지 않음

- **AC-9 [E][P1]**: Scenario: 스트릭 서버 동기화
  - Given 체크인 성공으로 `current === 5`가 되었고 `memberId === "uuid-1"`일 때
  - When 동기화 실행
  - Then `PUT /v1/members/uuid-1/streak`에 `{ currentStreak: 5, bestStreak: 5 }`가 전송되고, 실패해도 로컬 체크인은 롤백되지 않으며 사용자에게 에러 다이얼로그를 띄우지 않음

---

### F8. 온보딩 · 네비게이션 · 검수 컴플라이언스

- **Description**: 최초 진입 시 앱 사용법 안내를 1회 노출하고, 4개 탭(홈/캘린더/통계/랭킹) 네비게이션과 뱃지 진입 경로를 제공한다. 토스 검수 통과에 필요한 정책 제약(외부 이탈 금지, 하드코딩 색상 금지, 외부 로깅 금지 등)을 전역 규칙으로 검증한다.
- **Data**: `AppFlags`
- **API**: 없음
- **Requirements**: `FloatingTabBar`, 온보딩 BottomSheet, 전역 정책 가드.

- **AC-1 [E][P0]**: Scenario: 최초 진입 온보딩
  - Given `zss:flags:v1`이 없거나 `onboardingSeen === false`일 때
  - When 앱 최초 진입
  - Then TDS `BottomSheet`가 열리고 `"매일 0원 지출에 성공하면 체크인하세요"` 안내 3단계가 표시됨
  - And "시작하기" 탭 시 `zss:flags:v1`에 `{ onboardingSeen: true }`가 저장되고 이후 재진입 시 노출되지 않음

- **AC-2 [U][P0]**: `FloatingTabBar`는 `/`(홈), `/streak`(캘린더), `/stats`(통계), `/ranking`(랭킹) 4개 탭을 렌더하고, 현재 `location.pathname`과 일치하는 탭에 `data-active="true"`를 부여하며 각 탭 터치 타깃은 44x44px 이상이다.

- **AC-3 [W][P0]**: Scenario: 외부 도메인 이탈 차단
  - Given 앱 코드 전체에서
  - Then `window.open(` 및 `window.location.href =` 를 통한 외부 URL 이동 호출이 0건이며, 앱 설치 유도 문구("앱을 설치", "다운로드", "스토어에서 받기")가 렌더되지 않음

- **AC-4 [U][P0]**: Scenario: 색상 하드코딩 금지
  - Given `src/**/*.{ts,tsx,css}` 파일을 검사할 때
  - Then `#` 로 시작하는 3/6자리 HEX 색상 리터럴이 0건이고, 모든 커스텀 색상은 `var(--tds-color-*)`를 사용함

- **AC-5 [U][P0]**: Scenario: 외부 로깅 금지
  - Given `package.json` dependencies 및 `index.html`을 검사할 때
  - Then `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry` 관련 스크립트/패키지가 0건임

- **AC-6 [U][P1]**: Scenario: 프로덕션 콘솔 에러 0개
  - Given `npm run build` 후 프리뷰 실행 상태에서
  - When 홈 → 캘린더 → 통계 → 랭킹 → 뱃지 순으로 이동
  - Then `console.error` 호출 횟수가 0임

- **AC-7 [U][P1]**: Scenario: OS 호환성
  - Given Android 7(Chrome 60) / iOS 16 Safari 기준으로
  - Then `Array.prototype.at`, `Object.groupBy`, `Array.prototype.findLast`, `structuredClone` 미사용이며 빌드 target은 `es2019`임

- **AC-8 [W][P1]**: Scenario: 프로모션 지급 미사용 및 한도 가드
  - Given 본 MVP는 `grantPromotionReward`를 호출하지 않을 때
  - Then 코드베이스 내 `grantPromotionReward` 호출이 0건이며, 향후 도입 시 `amount <= 5000` 검증 없이는 호출할 수 없도록 래퍼 함수 `grantRewardSafe(amount)`가 `amount > 5000`이면 호출 없이 `{ ok: false, error: "AMOUNT_EXCEEDS_LIMIT" }`를 반환한다

- **AC-9 [W][P1]**: Scenario: 알 수 없는 경로
  - Given 사용자가 `/unknown` 경로로 진입할 때
  - Then `/`로 리다이렉트되고 `FloatingTabBar`의 홈 탭이 활성 상태가 됨

---

## Screen Definitions

### S1. 홈 (체크인) — `/`

- **TDS 컴포넌트**: `ScreenScaffold`, `Top`(타이틀 "무지출 챌린지"), `SummaryHero`(CountUp), `Card`, `Paragraph.Text`, `Chip`(오늘 완료 배지), `Button`(display="block", SubmitFooter 내부), `BottomSheet`(메모 입력), `TextField`(메모), `Toast`, `AlertDialog`(뱃지 축하), `Spacing`, `Skeleton`, `Asset.ContentIcon`
- **Layout/Presentation 계약**:
  - 골격: `ScreenScaffold` (raw div 금지)
  - 상단: `data-testid="streak-hero"` `SummaryHero` — value=현재 연속일수, CountUp, suffix "일 연속"
  - 그 아래: `data-testid="recovery-card"`(조건부, F5), `data-testid="streak-card"` Card(최고 기록·누적 일수, t3 강조)
  - 중단: `<AdSlot />` (스트릭 카드와 최근 7일 요약 사이)
  - 하단: 최근 7일 점 7개(`data-testid="last7-dots"`, 성공/실패 색 구분)
  - 1차 액션: `SubmitFooter` 내 `Button display="block"` (`data-testid="checkin-cta"`)
- **Loading**: 스토어 로딩 중 히어로/카드 자리에 `Skeleton`, CTA `disabled`
- **Empty**: 체크인 0건 → 히어로 `0`, `Asset.ContentIcon` + `"첫 무지출 데이를 기록해보세요"`
- **Error**: 저장 실패 시 Toast `"저장 공간이 부족해요. 앱 데이터를 정리해주세요"`
- **Touch**: CTA 높이 56px, 최근 7일 점 탭 영역 44x44px, BottomSheet 닫기 버튼 44x44px
- **Mobile keyboard**: 메모 TextField 포커스 시 BottomSheet가 키보드 높이만큼 상승, `enterKeyHint="done"`, Enter → 제출
- **Navigation state contract**:
  - Outgoing: 스트릭 카드 탭 → `navigate('/streak', { state: { focusMonth: string /* 'YYYY-MM' */ } })`
  - Outgoing: 뱃지 축하 다이얼로그 "컬렉션 보기" → `navigate('/badges', { state: { highlightBadgeId: BadgeId } })`
  - Incoming: `location.state = { justJoinedGroup: true } | null`

### S2. 스트릭 캘린더 — `/streak`

- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Button`(월 이동, size="small"), `Paragraph.Text`, `Card`, `BottomSheet`(날짜 상세), `Chip`(복구일 표시), `Spacing`, `Skeleton`, `Asset.ContentIcon`
- **Layout/Presentation 계약**:
  - 골격 `ScreenScaffold`, 헤더 행(이전/월 텍스트/다음)은 커스텀 flex
  - `data-testid="calendar-grid"` — 커스텀 CSS grid 7열, 각 셀 `data-testid="cell-{DateKey}"`, `data-state` ∈ `success|recovery|miss|future`
  - 캘린더 아래 `data-testid="month-summary-card"` Card — 해당 월 성공 일수/달성률 t3 강조
- **Loading**: 그리드 자리에 `Skeleton` 블록 1개
- **Empty**: 해당 월 기록 0건 → `Asset.ContentIcon` + `"이 달에는 기록이 없어요"`
- **Error**: 스토어 파싱 실패 시 빈 캘린더 + Toast `"기록을 불러오지 못했어요"`
- **Touch**: 셀 44x44px, 월 이동 버튼 44x44px
- **Scroll**: 캘린더는 고정 높이(최대 6주 행), 페이지 자체는 세로 스크롤. 가상 스크롤 불필요(최대 42셀)
- **Navigation state contract**:
  - Incoming: `location.state = { focusMonth: string /* 'YYYY-MM' */ } | null` — 없으면 이번 달
  - Outgoing: 없음(탭 네비만)

### S3. 통계 — `/stats`

- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Card`, `Paragraph.Text`, `Tab`(주간/월간 전환), `Spacing`, `Skeleton`, `Asset.ContentIcon`, `AdSlot`
- **Layout/Presentation 계약**:
  - `data-testid="stat-weekly-card"` Card — `data-testid="weekly-rate"` 달성률 t2 강조 + 보조 텍스트
  - `data-testid="stat-monthly-card"` Card — `data-testid="monthly-rate"` t2 강조 + 보조 텍스트
  - `data-testid="weekly-trend-sparkline"` Sparkline(최근 8주, 포인트 8개)
  - `data-testid="weekday-minibar"` MiniBar(월~일 7바, 0~100)
  - `<AdSlot />`은 월간 카드와 MiniBar 섹션 사이
- **Loading**: 각 Card 자리 `Skeleton`
- **Empty**: 체크인 0건 → 차트 대신 `Asset.ContentIcon` + `"기록이 쌓이면 통계를 보여드려요"`
- **Error**: 잘못된 DateKey는 무시하고 나머지로 계산, 화면 유지
- **Touch**: Tab 아이템 44px 이상
- **Navigation state contract**: Outgoing 없음 / Incoming `null`

### S4. 랭킹 — `/ranking`

- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Card`, `SummaryHero`(CountUp, 내 등수), `ListRow`(랭킹 행), `Button`, `TextField`(닉네임/코드), `BottomSheet`(그룹 만들기·참여), `Chip`(내 순위 강조), `Toast`, `Skeleton`, `Asset.ContentIcon`, `SubmitFooter`
- **Layout/Presentation 계약**:
  - 상단 `data-testid="my-rank-card"` Card + `SummaryHero`(내 등수, CountUp)
  - `data-testid="ranking-list"` — TDS `ListRow` 반복, 내 행에 `data-testid="ranking-me"` + `Chip("나")`
  - 그룹 코드 영역: `data-testid="copy-code"` 버튼(클립보드 복사 전용, 외부 이동 없음)
  - 미참여 시 `SubmitFooter`에 `Button display="block"` 2개("그룹 만들기", "코드로 참여")
- **Loading**: `Skeleton` ListRow 3개, 새로고침 버튼 `disabled`
- **Empty**: 그룹 미참여 → `Asset.ContentIcon` + `"친구와 함께 겨뤄보세요"`; 그룹원 1명 → 본인 행 + `"친구를 초대해 코드를 공유해보세요"`
- **Error**: 네트워크 실패 → 캐시 렌더 + `"오프라인 상태예요. 마지막 순위를 보여드려요"`; 404 → TextField 하단 `"존재하지 않는 코드예요"`
- **Touch**: ListRow 높이 56px, 복사 버튼 44x44px
- **Mobile keyboard**: 코드 TextField는 `inputMode="text"` + `autoCapitalize="characters"` + `maxLength={6}`, 닉네임은 `maxLength={10}`, 키보드 노출 시 BottomSheet 상승
- **Scroll**: 그룹 최대 50명. 20개 렌더 후 "더 보기" 버튼으로 20개씩 추가 렌더
- **Navigation state contract**:
  - Outgoing: 그룹 참여 성공 → `navigate('/', { state: { justJoinedGroup: true } })`
  - Incoming: `location.state = { openJoinSheet: true } | null` — `true`면 진입 즉시 참여 BottomSheet 오픈

### S5. 뱃지 컬렉션 — `/badges`

- **TDS 컴포넌트**: `ScreenScaffold`, `Top`(뒤로가기), `Card`, `Paragraph.Text`, `Chip`(획득일), `AlertDialog`, `Spacing`, `Asset.ContentIcon`
- **Layout/Presentation 계약**:
  - `data-testid="badge-grid"` — 커스텀 CSS grid 2열, 각 항목 `data-testid="badge-{id}"` TDS `Card`, `data-unlocked` ∈ `true|false`
  - 상단 진행 요약 Card: `"8개 중 3개 획득"` t3 강조
- **Loading**: 그리드 자리 `Skeleton` 카드 4개
- **Empty**: 해금 0개 → `Asset.ContentIcon` + `"아직 획득한 뱃지가 없어요. 3일 연속이면 첫 뱃지!"`
- **Error**: 스토어 손상 시 재판정 후 렌더, 콘솔 에러 없음
- **Touch**: 뱃지 카드 최소 높이 96px, 뒤로가기 44x44px
- **Navigation state contract**:
  - Incoming: `location.state = { highlightBadgeId: BadgeId } | null` — 존재 시 해당 카드로 스크롤 + 강조 테두리
  - Outgoing: 뒤로가기 → `navigate(-1)`

---

## Data Storage

| key | shape | 예상 크기 |
|---|---|---|
| `zss:checkins:v1` | `CheckInStore` | ~99KB (3년) |
| `zss:streak:v1` | `StreakState` | ~140B |
| `zss:recovery:v1` | `RecoveryState` | ~300B |
| `zss:badges:v1` | `BadgeStore` | ~560B |
| `zss:friendGroup:v1` | `FriendGroup` | ~160B |
| `zss:rankingCache:v1` | `{ version: 1; entries: RankingEntry[]; fetchedAt: number }` | ~6KB |
| `zss:flags:v1` | `AppFlags` | ~90B |
| **합계** | | **≈106KB / 5MB (2.1%)** |

읽기/쓰기 규칙:
- 모든 read는 `try/catch` + zod 유사 런타임 가드 → 실패 시 기본값으로 초기화 후 저장.
- 모든 write는 `try/catch(QuotaExceededError)` → `{ ok: false, reason: 'STORAGE_FULL' }` 반환.
- `version` 필드 불일치 시 마이그레이션 함수를 거치고, 마이그레이션 미정의 버전은 기본값으로 초기화.

---

## API Contract (외부 API 서버 — 별도 Railway 배포, F7 전용)

Base URL: `import.meta.env.VITE_API_BASE_URL`
공통 에러 응답: `{ error: string }`
CORS: 서버는 `Access-Control-Allow-Origin`에 미니앱 도메인을 허용하고 `OPTIONS` 프리플라이트에 200을 반환한다(F8 CORS 0건 요건).

### 1) 그룹 생성
```
POST /v1/groups
Request:  { nickname: string }               // 1~10자
Response: { groupCode: string; memberId: string }   // groupCode: /^[A-Z0-9]{6}$/
Errors:   400 { error: "INVALID_NICKNAME" }
          429 { error: "TOO_MANY_REQUESTS" }
          500 { error: "INTERNAL_ERROR" }
```

### 2) 그룹 참여
```
POST /v1/groups/join
Request:  { groupCode: string; nickname: string }
Response: { memberId: string; groupCode: string }
Errors:   400 { error: "INVALID_CODE_FORMAT" }
          404 { error: "GROUP_NOT_FOUND" }
          409 { error: "GROUP_FULL" }         // 최대 50명
          500 { error: "INTERNAL_ERROR" }
```

### 3) 스트릭 동기화
```
PUT /v1/members/{memberId}/streak
Request:  { currentStreak: number; bestStreak: number }   // 0 이상 정수
Response: { ok: true }
Errors:   400 { error: "INVALID_STREAK" }
          404 { error: "MEMBER_NOT_FOUND" }
          500 { error: "INTERNAL_ERROR" }
```

### 4) 랭킹 조회
```
GET /v1/groups/{groupCode}/ranking
Response: { entries: Array<{
             memberId: string;
             nickname: string;
             currentStreak: number;
             bestStreak: number;
             rank: number;
             isMe: boolean;
           }> }                                  // currentStreak DESC, 동점 시 bestStreak DESC
Errors:   404 { error: "GROUP_NOT_FOUND" }
          500 { error: "INTERNAL_ERROR" }
```

클라이언트 규칙:
- 모든 fetch는 `AbortController`로 8초 타임아웃. 타임아웃/네트워크 오류는 캐시 폴백(S4 Error 참조).
- 응답 파싱 실패 시에도 `console.error`를 호출하지 않고 UI 상태로만 처리한다.
- API 실패가 로컬 체크인 흐름(F1~F6)을 차단하지 않는다.

---

## Assumptions

- **A-1**: "무지출"은 사용자 자기 신고 방식이다. 토스 계좌/카드 거래 내역 조회 API는 사용하지 않는다(PRD에 명시 없음, 권한 심사 리스크).
- **A-2**: 체크인은 당일에만 가능하며 과거 날짜 소급 입력은 지원하지 않는다(복구권 예외).
- **A-3**: 복구 정책(끊긴 지 2일 이내, 하루 1회, 주 2회)은 PRD의 "1회 복구권"을 구체화한 값이다.
- **A-4**: 친구 초대는 6자리 그룹 코드 복사/붙여넣기 방식이다. 외부 SNS 공유 링크는 검수 정책(외부 이탈 금지)상 사용하지 않는다.
- **A-5**: 그룹 최대 인원 50명, 랭킹 캐시 TTL 5분.
- **A-6**: 본 앱은 생성형 AI를 사용하지 않으므로 AI 사전 고지/결과물 라벨 의무 대상이 아니다. 추후 AI 추천 기능 추가 시 해당 AC를 반드시 신설한다.
- **A-7**: 수익화는 배너 광고(홈·통계) + 보상형 광고(스트릭 복구)만 사용하며 IAP는 MVP 범위 밖이다.
- **A-8**: `getIsTossLoginIntegratedService()`가 `false`인 환경에서도 F1~F6는 완전 동작하고 F7만 잠금 상태로 표시된다.
- **A-9**: 랭킹 API 서버는 별도 Railway 배포이며 본 스펙의 작업 패킷 범위에는 클라이언트 연동 코드만 포함된다(서버 구현은 별도).

---

## Open Questions

- **Q-1**: 랭킹 API 서버를 MVP 1차에 포함할지, 아니면 F7을 "로컬 목 데이터 + 잠금 UI"로 먼저 출시하고 2차에 붙일지? (기본 가정: 클라이언트는 API 연동 완성, 서버 미배포 시 오프라인 폴백으로 동작)
- **Q-2**: 스트릭 복구 주간 한도 2회가 적절한지 — 너무 관대하면 스트릭의 가치가 희석되고, 너무 빡빡하면 광고 수익이 감소한다. A/B 없이 2회로 고정할지 확인 필요.
- **Q-3**: 뱃지 8종 중 `PERFECT_WEEK` 판정 기준을 "월~일 7일 전부"로 할지 "임의 연속 7일"로 할지 (현재 스펙: 월~일 고정 주 기준).
- **Q-4**: 그룹 코드 재발급/그룹 탈퇴 기능이 MVP에 필요한지 (현재 스펙: 미포함).
- **Q-5**: 앱 미실행일에 대한 처리 — 3일간 앱을 열지 않았다가 복귀했을 때 "그동안 무지출이었다"는 소급 인정을 허용할지 (현재 스펙: 불허, 복구권만 사용 가능).