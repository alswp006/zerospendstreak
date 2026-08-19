import { useEffect, useState } from 'react';
import { Top, Paragraph, Spacing, Chip, BottomSheet, TextField, Toast, Button, ListRow } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { Amount } from '@/components/Amount';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { AdSlot } from '@/components/AdSlot';
import { useCheckIns } from '@/hooks/useCheckIns';
import { addDays, formatKorean } from '@/lib/date';
import type { AddCheckInResult } from '@/lib/types';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '달력', path: '/calendar' },
  { label: '통계', path: '/stats' },
  { label: '뱃지', path: '/badges' },
  { label: '랭킹', path: '/rank' },
];

const MEMO_MAX_LENGTH = 50;
const TOAST_DURATION_MS = 2200;

type ToastKind = 'success' | 'duplicate' | 'storage_full' | 'invalid' | null;

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Home() {
  const { checkins, streak, isLoading, addCheckIn, hasCheckIn, getCheckInsInRange, today } = useCheckIns();

  const [toastKind, setToastKind] = useState<ToastKind>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (!toastKind) return;
    const timer = setTimeout(() => setToastKind(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toastKind]);

  const checkedToday = hasCheckIn(today);

  function applyResult(result: AddCheckInResult) {
    if (result.ok) {
      setToastKind('success');
      return;
    }
    if (result.reason === 'DUPLICATE') setToastKind('duplicate');
    else if (result.reason === 'STORAGE_FULL') setToastKind('storage_full');
    else setToastKind('invalid');
  }

  async function handleCheckIn() {
    fireHaptic('success');
    const result = await addCheckIn(today, 'manual');
    applyResult(result);
  }

  function openMemoSheet() {
    fireHaptic('tickWeak');
    setMemo('');
    setMemoOpen(true);
  }

  function closeMemoSheet() {
    setMemoOpen(false);
    setMemo('');
  }

  async function handleSaveMemo() {
    fireHaptic('success');
    const result = await addCheckIn(today, 'manual', memo);
    if (result.ok) {
      setMemoOpen(false);
      setMemo('');
    }
    applyResult(result);
  }

  if (isLoading) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>무지출 챌린지</Top.TitleParagraph>} />}>
        <LoadingState rows={4} testId="home-skeleton" />
      </ScreenScaffold>
    );
  }

  const weekStart = addDays(today, -6);
  const weekCheckins = getCheckInsInRange(weekStart, today);
  const recent = [...checkins].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  const toastText =
    toastKind === 'success'
      ? `오늘도 0원! 스트릭 ${streak.current}일째`
      : toastKind === 'duplicate'
        ? '오늘은 이미 체크인했어요'
        : toastKind === 'storage_full'
          ? '저장 공간이 부족해요. 오래된 기록을 정리해주세요'
          : toastKind === 'invalid'
            ? '체크인할 수 없는 날짜예요'
            : '';

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>무지출 챌린지</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <SummaryHero
        testId="streak-hero"
        label="현재 스트릭"
        value={<CountUp value={streak.current} unit="일째" typography="t1" />}
        caption={`최고 ${streak.best}일 · 누적 ${streak.totalDays}일`}
        action={
          <>
            <Button
              variant="fill"
              display="block"
              data-testid="checkin-button"
              style={{ minHeight: 52 }}
              disabled={checkedToday}
              onClick={handleCheckIn}
            >
              {checkedToday ? '오늘 체크인 완료' : '오늘 0원 썼어요'}
            </Button>
            {checkedToday ? (
              <>
                <Spacing size={12} />
                <Chip>내일 다시 도전</Chip>
              </>
            ) : (
              <>
                <Spacing size={8} />
                <Button variant="weak" display="block" data-testid="memo-sheet-open" onClick={openMemoSheet}>
                  메모 남기고 기록하기
                </Button>
              </>
            )}
          </>
        }
      />

      <Spacing size={16} />

      <Card testId="week-summary-card">
        <Paragraph.Text typography="st11">이번 주</Paragraph.Text>
        <Spacing size={4} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Paragraph.Text typography="t4">{`7일 중 ${weekCheckins.length}일 성공`}</Paragraph.Text>
          <Chip>{`${weekCheckins.length}/7`}</Chip>
        </div>
      </Card>

      <Spacing size={16} />

      <Card testId="streak-stat-card">
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Paragraph.Text typography="st11">최고 기록</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={streak.best} unit="일" typography="t3" />
          </div>
          <div style={{ flex: 1 }}>
            <Paragraph.Text typography="st11">누적 일수</Paragraph.Text>
            <Spacing size={4} />
            <Amount value={streak.totalDays} unit="일" typography="t3" />
          </div>
        </div>
      </Card>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">최근 기록</Paragraph.Text>
      <Spacing size={12} />

      {recent.length === 0 ? (
        <EmptyState iconName="iconEmptyBoxRegular" title="첫 무지출 도전을 시작해보세요" testId="home-empty" />
      ) : (
        <Card testId="recent-list-card">
          {recent.map((c) => (
            <ListRow
              key={c.date}
              contents={<ListRow.Texts type="2RowTypeA" top={formatKorean(c.date)} bottom={c.memo ?? '메모 없음'} />}
              right={<Chip>{c.source === 'recovery' ? '복구' : '성공'}</Chip>}
            />
          ))}
        </Card>
      )}

      <Spacing size={24} />
      <AdSlot adGroupId="home-recent-bottom" />
      <Spacing size={16} />

      <BottomSheet open={memoOpen} onClose={closeMemoSheet}>
        <div style={{ padding: 16 }}>
          <Paragraph.Text typography="t4">오늘의 메모</Paragraph.Text>
          <Spacing size={12} />
          <TextField
            variant="line"
            label="메모"
            placeholder="예: 편의점 대신 물 마시기"
            enterKeyHint="done"
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, MEMO_MAX_LENGTH))}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
          {memo.length >= MEMO_MAX_LENGTH ? (
            <>
              <Spacing size={4} />
              <Paragraph.Text typography="st13" color="secondary">
                메모는 50자까지 입력할 수 있어요
              </Paragraph.Text>
            </>
          ) : null}
          <Spacing size={16} />
          <Button variant="fill" display="block" onClick={handleSaveMemo}>
            저장
          </Button>
          <Spacing size={8} />
          <Button variant="weak" display="block" onClick={closeMemoSheet}>
            닫기
          </Button>
        </div>
      </BottomSheet>

      <Toast open={toastKind !== null} text={toastText} position="bottom" onClose={() => setToastKind(null)} />
    </ScreenScaffold>
  );
}
