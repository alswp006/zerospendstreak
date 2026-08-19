import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Top, Paragraph, Spacing, ListRow, Chip, Toast, Asset, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SubmitFooter } from '@/components/BottomCTA';
import { EmptyState } from '@/components/StateView';
import { TossRewardAd } from '@/components/TossRewardAd';
import { useRecovery } from '@/hooks/useRecovery';
import { useCheckIns } from '@/hooks/useCheckIns';
import { canRecover } from '@/lib/engine';
import { addDays, formatKorean } from '@/lib/date';
import type { RouteState } from '@/lib/types';

const AD_SLOT_ID = (import.meta.env.VITE_TOSS_AD_SLOT_ID as string | undefined) ?? 'recovery-ticket';

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

/** 오늘을 제외한 최근 7일 중 체크인이 없고 아직 복구하지 않은 날짜 목록. */
function findRecoverableDates(
  today: string,
  checkedDates: Set<string>,
  usages: Parameters<typeof canRecover>[2]
): string[] {
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const date = addDays(today, -i);
    if (checkedDates.has(date)) continue;
    if (!canRecover(date, today, usages).ok) continue;
    dates.push(date);
  }
  return dates;
}

export default function Recover() {
  const location = useLocation();
  const routeState = (location.state as RouteState['/recover']) ?? undefined;
  const initialTarget = routeState?.targetDate ?? null;

  const { wallet, canEarn, earnTicket, useTicket } = useRecovery();
  const { checkins, today, addCheckIn } = useCheckIns();
  const [selected, setSelected] = useState<string | null>(initialTarget);
  const [toast, setToast] = useState<string | null>(null);

  const checkedDates = useMemo(() => new Set(checkins.map((c) => c.date)), [checkins]);
  const recoverable = useMemo(
    () => findRecoverableDates(today, checkedDates, wallet.usages),
    [today, checkedDates, wallet.usages]
  );

  const canSubmit = wallet.tickets > 0 && selected !== null && recoverable.includes(selected);
  const alreadyEarnedToday = wallet.earnedToday >= 1 && wallet.earnedTodayDate === today;

  async function handleRecover() {
    if (selected === null) return;

    const spent = useTicket(selected);
    if (!spent.ok) {
      setToast(spent.reason === 'NO_TICKETS' ? '복구권이 없어요' : '저장 공간이 부족해요');
      return;
    }

    const added = await addCheckIn(selected, 'recovery');
    if (!added.ok) {
      setToast('그날은 이미 기록돼 있어요');
      return;
    }

    fireHaptic('success');
    setToast('스트릭을 복구했어요');
  }

  function handleEarnTicket() {
    const earned = earnTicket();
    if (!earned.ok) {
      if (earned.reason === 'MAX_TICKETS') {
        setToast('복구권은 최대 3개까지 가질 수 있어요');
      } else if (earned.reason === 'ALREADY_EARNED_TODAY') {
        setToast('오늘은 이미 받았어요');
      } else {
        setToast('저장 공간이 부족해요');
      }
      return;
    }

    fireHaptic('tickWeak');
    setToast('복구권을 받았어요');
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>스트릭 복구</Top.TitleParagraph>} />}
      bottom={
        <SubmitFooter label="복구하기" disabled={!canSubmit} onClick={handleRecover} />
      }
    >
      <Spacing size={16} />

      <Card testId="recover-wallet-card">
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="보유 복구권"
              bottom="최대 3개까지 모을 수 있어요"
            />
          }
          right={<Chip>{`${wallet.tickets}개`}</Chip>}
        />
      </Card>

      <Spacing size={24} />

      <Paragraph.Text typography="t4">복구할 날짜</Paragraph.Text>
      <Spacing size={12} />

      {recoverable.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconCalendarCheckRegular" alt="복구할 날 없음" />}
          title="복구할 날이 없어요"
          description="최근 7일은 빠짐없이 기록했어요"
          testId="recover-empty"
        />
      ) : (
        <Card testId="recover-date-list">
          {recoverable.map((date) => (
            <ListRow
              key={date}
              onClick={() => setSelected(date)}
              contents={<ListRow.Texts type="1RowTypeA" top={formatKorean(date)} />}
              right={<Chip>{selected === date ? '선택함' : '선택'}</Chip>}
            />
          ))}
        </Card>
      )}

      <Spacing size={24} />

      <TossRewardAd
        slotId={AD_SLOT_ID}
        description="광고를 보면 복구권을 하나 받을 수 있어요"
        buttonText="광고 보고 복구권 받기"
      >
        <Button variant="weak" display="block" disabled={!canEarn} onClick={handleEarnTicket}>
          광고 보고 복구권 받기
        </Button>
      </TossRewardAd>
      {alreadyEarnedToday ? (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13">오늘은 이미 받았어요</Paragraph.Text>
        </>
      ) : null}

      <Spacing size={24} />

      <Toast open={toast !== null} text={toast ?? ''} position="bottom" />
    </ScreenScaffold>
  );
}
