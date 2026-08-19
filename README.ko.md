🇺🇸 [English](./README.md)

# ZeroSpendStreak — 소비 제로 챌린지 (배지, 랭킹)

ZeroSpendStreak는 연속 기록, 마일스톤 배지, 친구들과의 친화적인 랭킹을 통해 사용자들이 하루에 0원을 소비하도록 동기부여하는 게이미피케이션 미니앱입니다. App-in-Toss 미니앱으로 구축되어 토스 앱 내에서 네이티브로 실행되며, 완전한 오프라인 지원(localStorage 지속성) 및 선택적 리더보드 통합을 제공합니다.

사용자는 매일 체크인하여 소비 제로 날짜를 기록하고, 성취 배지를 얻고, 리워드 광고로 얻은 회복권으로 깨진 연속 기록을 복구하며, 6자리 초대 코드를 통해 친구들과 경쟁합니다. 모든 데이터는 로컬에서 동기화되며, 랭킹은 선택적 외부 API 서버가 필요합니다.

## 주요 기능

- 📱 **일일 체크인** — 선택적 메모와 함께 소비 제로 성과 기록
- 📅 **캘린더 보기** — 월별 성공, 회복, 미기록 날짜 시각화
- 🎖️ **9개 마일스톤 배지** — 연속 기록 배지(3/7/14/30/60/100일), 누적 날짜 배지, 첫 회복 배지 획득
- 💪 **연속 기록 회복** — 리워드 광고로 얻은 회복권으로 최근 깨진 연속 기록 복구(7일 이내, 최대 3장, 1일 1장 획득)
- 📊 **통계** — 주간/월간 소비 제로율 및 8주 추이 스파크라인, 요일별 성공률 분석
- 👥 **리더보드** — 6자리 코드로 친구를 초대하여 랭킹 참여(오프라인 우선: API 불가 시 캐시된 결과)
- 🎯 **반응형 UI** — TDS(토스 디자인 시스템) 컴포넌트, 44px 이상 터치 타겟, 다크모드 자동 적용
- 🔄 **자동 동기화** — 체크인 시 연속 기록과 배지 자동 평가, 랭킹 데이터 선택적 외부 API 동기화

## 기술 스택

- **프론트엔드**: Vite, React 18, TypeScript 5
- **UI**: TDS(토스 디자인 시스템) — `@toss/tds-mobile`, `@toss/tds-mobile-ait`
- **라우팅**: React Router 7
- **상태 관리**: React hooks + localStorage (+ 랭킹용 선택적 외부 API)
- **테스트**: Vitest + @testing-library/react, Playwright 시각 회귀 테스트
- **앱 컨테이너**: App-in-Toss WebView(Android 7+, iOS 16+)

## 시작하기

### 필수 요구사항
- Node.js 18+
- npm 9+

### 설치 및 개발

```bash
# 의존성 설치
npm install

# 개발 서버 시작 (http://localhost:5173)
npm run dev

# 타입 체크
npm run typecheck

# 단위 테스트 실행
npm test

# 테스트 감시 모드
npm test:watch

# 시각 회귀 테스트
npm run test:visual
npm run test:visual:update  # 의도적인 UI 변경 후 스냅샷 업데이트

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm preview
```

## 환경 변수

| 변수 | 설명 | 필수 | 예시 |
|------|------|------|------|
| `VITE_RANK_API_BASE` | 랭킹 API 서버 기본 URL | 아니오 | `https://zss-rank.up.railway.app` |
| `VITE_TOSS_AD_GROUP_ID` | 토스 배너 광고 그룹 ID | 아니오(없으면 광고 비활성) | `100000123` |
| `VITE_TOSS_AD_SLOT_ID` | 토스 리워드 광고 슬롯 ID | 아니오(없으면 회복 광고 비활성) | `200000456` |

**참고:**
- 모든 환경 변수는 선택사항이며, 누락 시 앱이 우아하게 성능 저하
- 랭킹은 `VITE_RANK_API_BASE` 필요(외부 Railway 서버)
- 광고는 해당 토스 콘솔 ID 필요, 공백으로 두면 광고 기능 스킵
- Vite로 빌드되므로 환경 변수는 정적 번들에 포함, 프로덕션에서 .env.local 불가

## 프로젝트 구조

```
src/
├── pages/
│   ├── Home.tsx           # 일일 체크인, 연속 기록 표시
│   ├── Calendar.tsx       # 월간 캘린더 격자 및 체크인 이력
│   ├── Recover.tsx        # 리워드 광고를 통한 연속 기록 회복
│   ├── Stats.tsx          # 주간/월간 비율, 추이, 요일별 분석
│   ├── Badges.tsx         # 9개 배지 마일스톤 컬렉션
│   ├── Rank.tsx           # 리더보드 + 친구 초대
│   ├── Onboarding.tsx     # 첫 실행 투어
│   └── __TdsGallery.tsx   # (개발 전용) TDS 컴포넌트 참조
├── components/
│   ├── ScreenScaffold.tsx # 페이지 프레임(헤더 + 콘텐츠 + 하단 CTA)
│   ├── SummaryHero.tsx    # 큰 연속 기록 숫자 표시(CountUp)
│   ├── Card.tsx           # 콘텐츠 카드 컨테이너
│   ├── Amount.tsx         # 숫자/금액 표시(줄바꿈 방지)
│   ├── StateView.tsx      # 로딩 스켈레톤 / 빈 상태
│   ├── FloatingTabBar.tsx # 하단 탭 네비게이션
│   ├── AdSlot.tsx         # 배너 광고 컨테이너
│   ├── TossRewardAd.tsx   # 리워드 광고 게이트 컴포넌트
│   ├── Sparkline.tsx      # 인라인 추이 차트
│   ├── MiniBar.tsx        # 진행률 바 표시기
│   └── CountUp.tsx        # 애니메이션 숫자 카운터
├── hooks/
│   ├── useCheckIns.ts     # 체크인 CRUD + 파싱
│   ├── useStreak.ts       # 연속 기록 계산 + 캐싱
│   ├── useProfile.ts      # 사용자 ID, 닉네임, 초대 코드, 방
│   ├── useBadges.ts       # 배지 자동 평가
│   ├── useRecovery.ts     # 회복권 상태
│   └── useRank.ts         # 랭킹 API + 캐시 폴백
├── lib/
│   ├── types.ts           # 공유 도메인 타입(CheckIn, Badge 등)
│   ├── storage.ts         # localStorage 헬퍼(폴백 포함)
│   ├── dateUtil.ts        # KST 날짜 함수(todayKST, addDays 등)
│   ├── calc.ts            # 연속 기록/배지/비율 계산
│   └── constants.ts       # 배지 정의, 스토리지 키, 애니메이션
└── __tests__/             # 단위 테스트 + 목
    ├── __helpers__/       # 공유 테스트 목 + 렌더 유틸
    └── packet-*.test.ts   # 기능 테스트 스위트
```

## 배포

### 프로덕션 빌드

```bash
npm run build
```

정적 전용 Vite 번들을 `dist/`로 출력(CSR 전용, SSR 없음).

### Toss App-in-Toss 플랫폼에 배포

```bash
# 필수: app-in-toss 콘솔에서 API 키 획득
npx ait deploy --api-key <YOUR_API_KEY>
```

- **플랫폼**: Toss App-in-Toss(토스 앱 내 미니앱 호스팅)
- **호스팅**: Toss CDN(외부 Vercel/AWS 불필요)
- **최소 OS**: Android 7+, iOS 16+
- **앱 ID**: `zerospendstreak` (`granite.config.ts`에서, 콘솔 등록과 일치 필수)

**배포 전 체크:**
```bash
# 1. TypeScript 에러 없음
npm run typecheck

# 2. 모든 테스트 통과
npm test

# 3. 프로덕션 빌드 성공
npm run build

# 4. 시각 테스트 통과(Playwright)
npm run test:visual
```

## 준수사항 및 가드레일

**토스 검수 요구사항(AC):**
- ✅ 만 19세 이상만(미성년자 콘텐츠 금지)
- ✅ 아웃링크 또는 외부 URL 네비게이션 금지
- ✅ 프로덕션에 console.error 0개
- ✅ CORS 에러 0개
- ✅ Android 7+ / iOS 16+ Web API 호환성
- ✅ HEX 색상 하드코딩 금지(TDS/CSS 변수만)
- ✅ TDS 컴포넌트 필수(shadcn/MUI/Ant 금지)
- ✅ 외부 로깅 도구 금지(SDK Analytics만)

**데이터 저장:**
- 모든 사용자 데이터: localStorage(5MB 가용, ~89KB 사용)
- 랭킹 캐시: 선택적 API 폴백(네트워크 실패 시 캐시됨)
- 데이터베이스 없음, 백엔드 없음, 서버 사이드 렌더링 없음

## 스크립트

| 스크립트 | 용도 |
|---------|------|
| `npm run dev` | Vite 개발 서버 시작(5173) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드된 출력 로컬 미리보기 |
| `npm test` | 모든 단위 테스트 1회 실행 |
| `npm test:watch` | 활성 개발을 위한 감시 모드 |
| `npm run test:visual` | Playwright 시각 회귀 테스트 |
| `npm run test:visual:update` | 시각 회귀 베이스라인 업데이트 |
| `npm run typecheck` | TypeScript 엄격 체크(CI 게이트) |
| `npm run gate` | 사전 제출 체크(typecheck + build + test) |
| `npm run measure:tds` | TDS 컴포넌트 사용 밀도 분석 |

## 라이센스

MIT
