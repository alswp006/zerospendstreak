import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, Button } from '@toss/tds-mobile';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState, LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useCheckIns } from '@/hooks/useCheckIns';
import { diffDays, monthMatrix, todayKST } from '@/lib/date';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '달력', path: '/calendar' },
  { label: '통계', path: '/stats' },
  { label: '뱃지', path: '/badges' },
  { label: '랭킹', path: '/rank' },
];

/** 'YYYY-MM-DD'에서 연·월을 뽑는다. 시스템 타임존을 타지 않도록 문자열에서 직접 파싱. */
function splitYearMonth(dateStr: string): { year: number; month: number } {
  return { year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) };
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

export default function Calendar() {
  const navigate = useNavigate();
  const { checkins, today, isLoading } = useCheckIns();
  const [cursor, setCursor] = useState(() => splitYearMonth(todayKST()));

  const checkedDates = useMemo(() => new Map(checkins.map((c) => [c.date, c.source])), [checkins]);
  const cells = useMemo(() => monthMatrix(cursor.year, cursor.month), [cursor]);
  const monthCount = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;
    return checkins.filter((c) => c.date.startsWith(prefix)).length;
  }, [checkins, cursor]);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>기록 달력</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Button variant="weak" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}>
          이전 달
        </Button>
        <Paragraph.Text typography="t4">
          {cursor.year}년 {cursor.month}월
        </Paragraph.Text>
        <Button variant="weak" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}>
          다음 달
        </Button>
      </div>

      <Spacing size={16} />

      {isLoading ? (
        <LoadingState rows={4} testId="calendar-skeleton" />
      ) : (
        <Card testId="calendar-grid">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <Paragraph.Text typography="st11">{label}</Paragraph.Text>
              </div>
            ))}
            {cells.map((date, idx) => {
              if (date === null) {
                return <div key={`pad-${idx}`} style={{ minHeight: 44 }} />;
              }
              const source = checkedDates.get(date);
              const recoverable = !source && date < today && diffDays(today, date) <= 7;
              return (
                <button
                  key={date}
                  type="button"
                  data-testid={`day-${date}`}
                  aria-label={`${Number(date.slice(8, 10))}일 ${source ? '기록됨' : '기록 없음'}`}
                  disabled={!recoverable}
                  onClick={() => navigate('/recover', { state: { targetDate: date } })}
                  style={{
                    minHeight: 44,
                    border: 'none',
                    borderRadius: 10,
                    cursor: recoverable ? 'pointer' : 'default',
                    color: source ? 'var(--adaptiveBlue600)' : 'var(--adaptiveGrey600)',
                    backgroundColor: source
                      ? 'var(--adaptiveBlue100)'
                      : date === today
                        ? 'var(--adaptiveGrey100)'
                        : 'transparent',
                    fontSize: 14,
                    fontWeight: source ? 700 : 500,
                  }}
                >
                  {Number(date.slice(8, 10))}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Spacing size={16} />

      {!isLoading && monthCount === 0 ? (
        <EmptyState
          title="이 달은 기록이 없어요"
          description="지출 0원인 날을 체크하면 여기에 쌓여요"
          testId="calendar-empty"
        />
      ) : (
        <Paragraph.Text typography="t6">이번 달 {monthCount}일 성공</Paragraph.Text>
      )}

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
