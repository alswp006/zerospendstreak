🇰🇷 [한국어](./README.ko.md)

# ZeroSpendStreak — Zero-spending streak challenge with badges and rankings

ZeroSpendStreak is a gamified mini app that motivates users to spend 0 won per day through streak tracking, milestone badges, and friendly rankings with friends. Built as an App-in-Toss mini app, it runs natively within the Toss app with complete offline support (localStorage persistence) and optional leaderboard integration.

Users check in daily to record no-spending days, earn achievement badges, recover broken streaks with reward ads, and compete with friends through 6-digit invite codes. All data syncs locally; rankings require an optional external API server.

## Features

- 📱 **Daily Check-in** — Record zero-spending achievements with optional memos
- 📅 **Calendar View** — Visualize success, recovery, and missed days month-by-month
- 🎖️ **9 Milestone Badges** — Earn streak badges (3/7/14/30/60/100 days), total day badge, and first-use recovery badge
- 💪 **Streak Recovery** — Use reward-ad-earned recovery tickets to salvage recent broken streaks (within 7 days, max 3 tickets, 1 earned per day)
- 📊 **Statistics** — Weekly/monthly zero-spending rates with 8-week trend sparklines and weekday success breakdowns
- 👥 **Leaderboard** — Invite friends via 6-character codes to join rankings (offline-first: cached results if API unavailable)
- 🎯 **Responsive UI** — TDS (Toss Design System) components, 44px+ touch targets, dark mode auto-applied
- 🔄 **Auto Sync** — Streaks and badges auto-evaluate on check-in; ranking data syncs to optional external API

## Tech Stack

- **Frontend**: Vite, React 18, TypeScript 5
- **UI**: TDS (Toss Design System) — `@toss/tds-mobile`, `@toss/tds-mobile-ait`
- **Routing**: React Router 7
- **State**: React hooks + localStorage (+ optional external API for rankings)
- **Testing**: Vitest + @testing-library/react, Playwright visual regression
- **App Container**: App-in-Toss WebView (Android 7+, iOS 16+)

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation & Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type checking
npm run typecheck

# Run unit tests
npm test

# Watch mode for tests
npm test:watch

# Visual regression tests
npm run test:visual
npm run test:visual:update  # Update snapshots after intentional UI changes

# Production build
npm run build

# Preview production build
npm preview
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_RANK_API_BASE` | Ranking API server base URL | No | `https://zss-rank.up.railway.app` |
| `VITE_TOSS_AD_GROUP_ID` | Toss banner ad group ID | No (ads disabled if absent) | `100000123` |
| `VITE_TOSS_AD_SLOT_ID` | Toss reward ad slot ID | No (recovery ads disabled if absent) | `200000456` |

**Notes:**
- All env vars are optional; app degrades gracefully when missing
- Rankings require `VITE_RANK_API_BASE` (external Railway server)
- Ads require corresponding Toss console IDs; leave blank to skip ad features
- Built via Vite, env vars are baked into static bundle; no .env.local in production

## Project Structure

```
src/
├── pages/
│   ├── Home.tsx           # Daily check-in, streak display
│   ├── Calendar.tsx       # Month calendar grid with check-in history
│   ├── Recover.tsx        # Streak recovery via reward ads
│   ├── Stats.tsx          # Weekly/monthly rates, trends, weekday breakdown
│   ├── Badges.tsx         # 9-badge milestone collection
│   ├── Rank.tsx           # Leaderboard + friend invites
│   ├── Onboarding.tsx     # First-run tour
│   └── __TdsGallery.tsx   # (Dev-only) TDS component reference
├── components/
│   ├── ScreenScaffold.tsx # Page frame (header + content + footer CTA)
│   ├── SummaryHero.tsx    # Large streak number display (CountUp)
│   ├── Card.tsx           # Content card container
│   ├── Amount.tsx         # Number/currency display (no-wrap)
│   ├── StateView.tsx      # Loading skeleton / empty state
│   ├── FloatingTabBar.tsx # Bottom tab navigation
│   ├── AdSlot.tsx         # Banner ad container
│   ├── TossRewardAd.tsx   # Reward ad gate component
│   ├── Sparkline.tsx      # Inline trend chart
│   ├── MiniBar.tsx        # Progress bar indicator
│   └── CountUp.tsx        # Animated number counter
├── hooks/
│   ├── useCheckIns.ts     # Check-in CRUD + parsing
│   ├── useStreak.ts       # Streak calculation + caching
│   ├── useProfile.ts      # User ID, nickname, invite code, room
│   ├── useBadges.ts       # Badge auto-evaluation
│   ├── useRecovery.ts     # Recovery ticket state
│   └── useRank.ts         # Ranking API + cache fallback
├── lib/
│   ├── types.ts           # Shared domain types (CheckIn, Badge, etc.)
│   ├── storage.ts         # localStorage helpers (get/set with fallback)
│   ├── dateUtil.ts        # KST date functions (todayKST, addDays, etc.)
│   ├── calc.ts            # Streak/badge/rate calculations
│   └── constants.ts       # Badge defs, storage keys, animations
└── __tests__/             # Unit tests + mocks
    ├── __helpers__/       # Shared test mocks + render utils
    └── packet-*.test.ts   # Feature test suites
```

## Deployment

### Building for Production

```bash
npm run build
```

Outputs a static-only Vite bundle to `dist/` (CSR-only, no SSR).

### Deploying to Toss App-in-Toss Platform

```bash
# Prerequisites: API key from apps-in-toss console
npx ait deploy --api-key <YOUR_API_KEY>
```

- **Platform**: Toss App-in-Toss (hosts mini apps inside Toss app)
- **Hosting**: Toss CDN (no external Vercel/AWS required)
- **Minimum OS**: Android 7+, iOS 16+
- **App ID**: `zerospendstreak` (from `granite.config.ts`, must match console registration)

**Pre-deployment checks:**
```bash
# 1. No TypeScript errors
npm run typecheck

# 2. All tests pass
npm test

# 3. Production build succeeds
npm run build

# 4. Visual tests pass (Playwright)
npm run test:visual
```

## Compliance & Guardrails

**Toss Review Requirements (AC):**
- ✅ Users 19+ only (no minor content)
- ✅ No outlinks or external URL navigation
- ✅ 0 console.error in production
- ✅ 0 CORS errors
- ✅ Android 7+ / iOS 16+ Web API compatibility
- ✅ HEX color hardcoding forbidden (TDS/CSS vars only)
- ✅ TDS components mandatory (no shadcn/MUI/Ant)
- ✅ External logging tools forbidden (SDK Analytics only)

**Data Storage:**
- All user data: localStorage (5MB available, ~89KB used)
- Ranking cache: Optional API fallback (cached if network fails)
- No database, no backend, no server-side rendering

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server (5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview built output locally |
| `npm test` | Run all unit tests once |
| `npm test:watch` | Watch mode for active development |
| `npm run test:visual` | Playwright visual regression tests |
| `npm run test:visual:update` | Update visual regression baselines |
| `npm run typecheck` | TypeScript strict check (CI gate) |
| `npm run gate` | Pre-submit checks (typecheck + build + test) |
| `npm run measure:tds` | Analyze TDS component usage density |

## License

MIT
