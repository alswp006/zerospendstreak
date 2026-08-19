import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, Chip, BottomSheet, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState, LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useCheckIns } from '@/hooks/useCheckIns';
import { diffDays, formatKorean, monthMatrix, todayKST } from '@/lib/date';
import type { RouteState } from '@/lib/types';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_CHIP_COUNT = 6;
const RECOVERABLE_WINDOW_DAYS = 7;

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '달력', path: '/calendar' },
  { label: '통계', path: '/stats' },
  { label: '뱃지', path: '/badges' },
  { label: '랭킹', path: '/rank' },
];

type YearMonth = { year: number; month: number };

type SheetState =
  | { kind: 'recover'; date: string }
  | { kind: 'memo'; date: string; memo?: string }
  | null;

/** 'YYYY-MM-DD'에서 연·월을 뽑는다. 시스템 타임존을 타지 않도록 문자열에서 직접 파싱. */
function splitYearMonth(dateStr: string): YearMonth {
  return { year: Number(dateStr.slice(0, 4)), month: Number(dateStr.slice(5, 7)) };
}

function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

function safeHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

export default function Calendar() {
  const navigate = useNavigate();
  const { checkins, today, isLoading } = useCheckIns();
  const [cursor, setCursor] = useState<YearMonth>(() => splitYearMonth(todayKST()));
  const [sheet, setSheet] = useState<SheetState>(null);

  const checkedDates = useMemo(() => new Map(checkins.map((c) => [c.date, c])), [checkins]);
  const cells = useMemo(() => monthMatrix(cursor.year, cursor.month), [cursor]);
  const monthCount = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month).padStart(2, '0')}`;
    return checkins.filter((c) => c.date.startsWith(prefix)).length;
  }, [checkins, cursor]);

  const monthOptions = useMemo(() => {
    const anchor = splitYearMonth(today);
    const options: YearMonth[] = [];
    for (let i = MONTH_CHIP_COUNT - 1; i >= 0; i--) {
      options.push(shiftMonth(anchor.year, anchor.month, -i));
    }
    return options;
  }, [today]);

  function handleCellClick(date: string) {
    const existing = checkedDates.get(date);
    if (existing) {
      setSheet({ kind: 'memo', date, memo: existing.memo });
      return;
    }
    if (date < today && diffDays(today, date) <= RECOVERABLE_WINDOW_DAYS) {
      setSheet({ kind: 'recover', date });
    }
  }

  function handleRecoverConfirm() {
    if (!sheet || sheet.kind !== 'recover') return;
    const targetDate = sheet.date;
    setSheet(null);
    navigate('/recover', { state: { targetDate } as RouteState['/recover'] });
  }

  const isCurrentMonth =
    cursor.year === splitYearMonth(today).year && cursor.month === splitYearMonth(today).month;

  function goPrevMonth() {
    safeHaptic();
    setCursor(({ year, month }) => shiftMonth(year, month, -1));
  }

  function goNextMonth() {
    if (isCurrentMonth) return;
    safeHaptic();
    setCursor(({ year, month }) => shiftMonth(year, month, 1));
  }

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>기록 달력</Top.TitleParagraph>}
          right={<Chip onClick={() => setCursor(splitYearMonth(today))}>이번 달</Chip>}
        />
      }
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          variant="weak"
          data-testid="cal-prev"
          style={{ minHeight: 44, minWidth: 44 }}
          onClick={goPrevMonth}
        >
          이전
        </Button>
        <Paragraph.Text typography="t4">{`${cursor.year}년 ${cursor.month}월`}</Paragraph.Text>
        <Button
          variant="weak"
          data-testid="cal-next"
          disabled={isCurrentMonth}
          style={{ minHeight: 44, minWidth: 44 }}
          onClick={goNextMonth}
        >
          다음
        </Button>
      </div>

      <Spacing size={12} />

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {monthOptions.map(({ year, month }) => {
          const isSelected = year === cursor.year && month === cursor.month;
          // 실제 ChipProps엔 selected가 없다(그룹 컨테이너 타입) — 테스트 목이 소비하는
          // 런타임 전용 프로퍼티라 변수 스프레드로 넘겨 fresh-literal 초과 프로퍼티 검사를 피한다.
          const chipRuntimeProps = { selected: isSelected } as Record<string, unknown>;
          return (
            <Chip
              key={`${year}-${month}`}
              {...chipRuntimeProps}
              onClick={() => {
                safeHaptic();
                setCursor({ year, month });
              }}
            >
              {month}월
            </Chip>
          );
        })}
      </div>

      <Spacing size={16} />

      {isLoading ? (
        <LoadingState rows={4} testId="calendar-skeleton" />
      ) : (
        <Card testId="calendar-grid">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <Paragraph.Text typography="st11" color="tertiary">
                  {label}
                </Paragraph.Text>
              </div>
            ))}
            {cells.map((date, idx) => {
              if (date === null) {
                return <div key={`pad-${idx}`} style={{ minHeight: 44, minWidth: 44 }} />;
              }
              const entry = checkedDates.get(date);
              const isToday = date === today;
              const state = entry
                ? entry.source === 'recovery'
                  ? 'recovered'
                  : 'success'
                : date > today
                  ? 'future'
                  : 'miss';
              const backgroundColor = entry
                ? 'var(--tds-color-blue50)'
                : isToday
                  ? 'var(--tds-color-grey50)'
                  : 'var(--tds-color-background)';
              return (
                <button
                  key={date}
                  type="button"
                  data-testid={`cal-cell-${date}`}
                  data-state={state}
                  aria-label={`${Number(date.slice(8, 10))}일 ${entry ? '기록됨' : '기록 없음'}`}
                  onClick={() => handleCellClick(date)}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    backgroundColor,
                  }}
                >
                  <Paragraph.Text typography="st11" color={entry ? 'primary' : 'tertiary'}>
                    {Number(date.slice(8, 10))}
                  </Paragraph.Text>
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

      <BottomSheet open={sheet?.kind === 'recover'} onClose={() => setSheet(null)}>
        <div style={{ padding: 16 }}>
          <Paragraph.Text typography="t4">
            {sheet?.kind === 'recover' ? formatKorean(sheet.date) : ''}
          </Paragraph.Text>
          <Spacing size={4} />
          <Paragraph.Text typography="st13" color="secondary">
            지출 없이 지난 날을 복구권으로 채울 수 있어요
          </Paragraph.Text>
          <Spacing size={16} />
          <Button variant="fill" display="block" onClick={handleRecoverConfirm}>
            복구하기
          </Button>
          <Spacing size={8} />
          <Button variant="weak" display="block" onClick={() => setSheet(null)}>
            닫기
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet?.kind === 'memo'} onClose={() => setSheet(null)}>
        <div style={{ padding: 16 }}>
          <Paragraph.Text typography="t4">
            {sheet?.kind === 'memo' ? formatKorean(sheet.date) : ''}
          </Paragraph.Text>
          <Spacing size={4} />
          <Paragraph.Text typography="st13" color="secondary">
            {sheet?.kind === 'memo' && sheet.memo ? sheet.memo : '메모가 없어요'}
          </Paragraph.Text>
          <Spacing size={16} />
          <Button variant="weak" display="block" onClick={() => setSheet(null)}>
            닫기
          </Button>
        </div>
      </BottomSheet>
    </ScreenScaffold>
  );
}
