import { useMemo } from 'react';
import { Top, Paragraph, Spacing, ListRow, Chip } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { Amount } from '@/components/Amount';
import { MiniBar } from '@/components/MiniBar';
import { Sparkline } from '@/components/Sparkline';
import { EmptyState, LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useCheckIns } from '@/hooks/useCheckIns';
import { calcRate, calcWeekdayRates, calcWeeklyTrend } from '@/lib/engine';

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

export default function Stats() {
  const { checkins, streak, today, isLoading } = useCheckIns();

  const stats = useMemo(() => {
    const firstDate = checkins.reduce<string | undefined>(
      (min, c) => (min === undefined || c.date < min ? c.date : min),
      undefined
    );
    return {
      weekly: calcRate(checkins, today, 7, firstDate).rate,
      monthly: calcRate(checkins, today, 30, firstDate).rate,
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

  if (checkins.length === 0) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>무지출 통계</Top.TitleParagraph>} />}
        bottom={<FloatingTabBar items={TAB_ITEMS} />}
      >
        <Spacing size={16} />
        <EmptyState
          title="아직 통계가 없어요"
          description="체크인을 시작하면 달성률이 쌓여요"
          testId="stats-empty"
        />
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>무지출 통계</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <SummaryHero
        label="누적 무지출"
        value={<Amount value={streak.totalDays} unit="일" typography="t1" />}
        caption={`최고 연속 ${streak.best}일`}
        testId="stats-hero"
      />

      <Spacing size={16} />

      <Card testId="stats-rate-card">
        <ListRow
          contents={
            <ListRow.Texts type="2RowTypeA" top="최근 7일" bottom={`달성률 ${stats.weekly}%`} />
          }
          right={<Chip>{`${stats.weekly}%`}</Chip>}
        />
        <MiniBar ratio={stats.weekly / 100} />
        <Spacing size={12} />
        <ListRow
          contents={
            <ListRow.Texts type="2RowTypeA" top="최근 30일" bottom={`달성률 ${stats.monthly}%`} />
          }
          right={<Chip>{`${stats.monthly}%`}</Chip>}
        />
        <MiniBar ratio={stats.monthly / 100} />
      </Card>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">주간 추세</Paragraph.Text>
      <Spacing size={12} />
      <Card testId="stats-trend-card">
        <Sparkline data={stats.trend.map((w) => w.count)} />
        <Spacing size={8} />
        <Paragraph.Text typography="st11">최근 8주, 주당 성공한 날 수</Paragraph.Text>
      </Card>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">요일별 성공률</Paragraph.Text>
      <Spacing size={12} />
      <Card testId="stats-weekday-card">
        {WEEKDAY_ROWS.map((row) => (
          <ListRow
            key={row.key}
            contents={<ListRow.Texts type="1RowTypeA" top={row.label} />}
            right={<Chip>{`${stats.weekdays[row.key]}%`}</Chip>}
          />
        ))}
      </Card>

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
