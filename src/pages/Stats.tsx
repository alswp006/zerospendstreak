import { useMemo } from 'react';
import { Top, Paragraph, Spacing, ListRow, Chip } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { BannerSection } from '@/components/BannerSection';
import { useCheckIns } from '@/hooks/useCheckIns';
import { addDays } from '@/lib/date';
import { calcRate, calcWeekdayRates, calcWeeklyTrend } from '@/lib/engine';
import type { CheckIn } from '@/lib/types';

const WEEKDAY_ROWS: Array<{ key: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'; label: string }> = [
  { key: 'MON', label: '월요일' },
  { key: 'TUE', label: '화요일' },
  { key: 'WED', label: '수요일' },
  { key: 'THU', label: '목요일' },
  { key: 'FRI', label: '금요일' },
  { key: 'SAT', label: '토요일' },
  { key: 'SUN', label: '일요일' },
];

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '달력', path: '/calendar' },
  { label: '통계', path: '/stats' },
  { label: '뱃지', path: '/badges' },
  { label: '랭킹', path: '/rank' },
];

/** windowDays 기간(오늘 포함) 내 고유 체크인 일수. rate 계산과 달리 계정 나이로 축소하지 않는다(표시용 단순 카운트). */
function countInWindow(checkins: CheckIn[], today: string, windowDays: number): number {
  const windowStart = addDays(today, -(windowDays - 1));
  const uniqueDates = new Set(checkins.map((c) => c.date));
  let count = 0;
  uniqueDates.forEach((date) => {
    if (date >= windowStart && date <= today) count += 1;
  });
  return count;
}

/** 주차 막대 라벨 — 'YYYY-MM-DD' → 'M/D'. */
function formatWeekLabel(weekStart: string): string {
  return `${Number(weekStart.slice(5, 7))}/${Number(weekStart.slice(8, 10))}`;
}

export default function Stats() {
  const { checkins, today, isLoading } = useCheckIns();

  const stats = useMemo(() => {
    const firstDate = checkins.reduce<string | undefined>(
      (min, c) => (min === undefined || c.date < min ? c.date : min),
      undefined
    );
    return {
      weekly: calcRate(checkins, today, 7, firstDate).rate,
      weeklySuccess: countInWindow(checkins, today, 7),
      monthly: calcRate(checkins, today, 30, firstDate).rate,
      monthlySuccess: countInWindow(checkins, today, 30),
      weekdays: calcWeekdayRates(checkins, today),
      trend: calcWeeklyTrend(checkins, today),
    };
  }, [checkins, today]);

  if (isLoading) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>무지출 통계</Top.TitleParagraph>} />}
        bottom={<FloatingTabBar items={TAB_ITEMS} />}
      >
        <LoadingState rows={4} testId="stats-skeleton" />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>무지출 통계</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      {checkins.length === 0 ? (
        <>
          <Spacing size={16} />
          <EmptyState
            iconName="iconChartLineRegular"
            title="아직 통계가 없어요"
            description="체크인을 시작하면 통계가 쌓여요"
            testId="stats-empty"
          />
        </>
      ) : null}

      <Spacing size={16} />

      <Card testId="stats-rate-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="최근 7일"
              bottom={`${stats.weeklySuccess}일 성공 / 7일`}
            />
          }
          right={<Chip>{`${stats.weekly}%`}</Chip>}
        />
        <Spacing size={12} />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="최근 30일"
              bottom={`${stats.monthlySuccess}일 성공 / 30일`}
            />
          }
          right={<Chip>{`${stats.monthly}%`}</Chip>}
        />
      </Card>

      {checkins.length > 0 ? (
        <>
          <Spacing size={24} />
          <Paragraph.Text typography="t4">주간 추세</Paragraph.Text>
          <Spacing size={12} />
          <Card testId="stats-trend-card">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
              {stats.trend.map((week) => (
                <div
                  key={week.weekStart}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    data-testid="trend-bar"
                    data-count={week.count}
                    style={{
                      width: '100%',
                      height: Math.max(4, (week.count / 7) * 88),
                      borderRadius: 4,
                      backgroundColor: 'var(--tds-color-blue200)',
                    }}
                  />
                  <span data-testid="trend-bar-label">
                    <Paragraph.Text typography="st11" color="tertiary">
                      {formatWeekLabel(week.weekStart)}
                    </Paragraph.Text>
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Spacing size={24} />
          <Paragraph.Text typography="t4">요일별 성공률</Paragraph.Text>
          <Spacing size={12} />
          <Card testId="stats-weekday-card">
            {WEEKDAY_ROWS.map((row) => (
              <div key={row.key} data-testid="weekday-row" data-weekday={row.key}>
                <ListRow
                  contents={<ListRow.Texts type="1RowTypeA" top={row.label} />}
                  right={<Chip>{`${Math.round(stats.weekdays[row.key])}%`}</Chip>}
                />
              </div>
            ))}
          </Card>

          <BannerSection />
        </>
      ) : null}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
