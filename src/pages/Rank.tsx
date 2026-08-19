import { useEffect, useState } from 'react';
import {
  Top,
  Paragraph,
  Spacing,
  Button,
  TextField,
  Toast,
  Chip,
  Badge,
} from '@toss/tds-mobile';
// Asset.ContentIcon은 아이콘을 CDN에서 받아온다 — 응답이 실패하면(오프라인·차단) 컴포넌트가
// throw해 라우트 전체가 에러 바운더리로 떨어진다(빈 상태 하나 때문에 화면이 죽음).
// 빈 상태는 제목+설명만으로 충분히 읽히므로 아이콘 의존을 걷어냈다.
import { generateHapticFeedback, setClipboardText } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { EmptyState, LoadingState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { AdSlot } from '@/components/AdSlot';
import { useProfile } from '@/hooks/useProfile';
import { isRankEnabled, joinRoom, fetchRank } from '@/lib/rankApi';
import { readRankCache, writeProfile } from '@/lib/storage';
import type { RankEntry } from '@/lib/types';

const CODE_REGEX = /^[A-Z0-9]{6}$/;

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '랭킹', path: '/rank' },
];

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function copyInviteCode(code: string) {
  try {
    Promise.resolve(setClipboardText(code)).catch(() => {});
  } catch {
    /* WebView 밖 — 무시 */
  }
}

function RankRow({ entry, isMe }: { entry: RankEntry; isMe: boolean }) {
  return (
    <div
      data-testid="rank-entry"
      style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 44, padding: '8px 0' }}
    >
      <Badge size="small" variant="weak" color="elephant">
        {entry.rank}
      </Badge>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Paragraph.Text typography="t5">{entry.nickname}</Paragraph.Text>
        <Paragraph.Text typography="t7" color="var(--adaptiveGrey700)">
          {`최고 ${entry.bestStreak}일 · 누적 ${entry.totalDays}일`}
        </Paragraph.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {isMe && (
          <Badge size="small" variant="fill" color="blue">
            나
          </Badge>
        )}
        <Badge size="small" variant="weak" color="teal">
          {`${entry.currentStreak}일`}
        </Badge>
      </div>
    </div>
  );
}

export default function Rank() {
  const { profile } = useProfile();
  const rankEnabled = isRankEnabled();

  const [roomCode, setRoomCode] = useState<string | null>(profile.roomCode);
  const [inviteInput, setInviteInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(() => !!profile.roomCode);
  const [networkError, setNetworkError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!rankEnabled || !roomCode) return;
    let cancelled = false;
    setLoading(true);
    setNetworkError(false);

    fetchRank(roomCode).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setEntries(result.entries);
        setNetworkError(false);
      } else {
        setNetworkError(true);
        setEntries(readRankCache());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rankEnabled, roomCode, retryTick]);

  useEffect(() => {
    if (!toastText) return;
    const timer = setTimeout(() => setToastText(null), 2000);
    return () => clearTimeout(timer);
  }, [toastText]);

  function handleJoin() {
    fireHaptic('success');
    if (!CODE_REGEX.test(inviteInput)) {
      setInputError('초대 코드는 6자예요');
      return;
    }
    setInputError(null);
    setJoining(true);
    joinRoom(profile.deviceUserId, inviteInput).then((result) => {
      setJoining(false);
      if (!result.ok) {
        setToastText(result.code === 'ROOM_NOT_FOUND' ? '방을 찾을 수 없어요' : '지금은 참여할 수 없어요');
        return;
      }
      writeProfile({ ...profile, roomCode: result.roomCode });
      setRoomCode(result.roomCode);
    });
  }

  function handleCopyCode() {
    copyInviteCode(profile.inviteCode);
    setToastText('초대 코드를 복사했어요');
  }

  function handleRetry() {
    setRetryTick((t) => t + 1);
  }

  if (!rankEnabled) {
    return (
      <ScreenScaffold
        top={<Top title={<Top.TitleParagraph>친구 랭킹</Top.TitleParagraph>} />}
        bottom={<FloatingTabBar items={TAB_ITEMS} />}
      >
        <Spacing size={16} />
        <EmptyState
          title="랭킹은 곧 열려요"
          description="조금만 기다려주세요"
          testId="rank-disabled"
        />
        <Spacing size={24} />
      </ScreenScaffold>
    );
  }

  const sortedEntries = [...entries].sort((a, b) => a.rank - b.rank);
  const soloOnly = sortedEntries.length <= 1;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>친구 랭킹</Top.TitleParagraph>}
          right={<Chip onClick={handleCopyCode}>{`내 코드 ${profile.inviteCode}`}</Chip>}
        />
      }
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <Spacing size={16} />

      {!roomCode && (
        <Card testId="rank-join-card">
          <Paragraph.Text typography="t5">
            친구 초대 코드를 입력하면 함께 순위를 볼 수 있어요
          </Paragraph.Text>
          <Spacing size={12} />
          <TextField
            variant="box"
            label="초대 코드"
            placeholder="예: K3M9QZ"
            help={inputError ?? '6자 대문자·숫자'}
            hasError={!!inputError}
            value={inviteInput}
            onChange={(e) => {
              setInviteInput(e.target.value);
              if (inputError) setInputError(null);
            }}
          />
          <Spacing size={12} />
          <Button variant="fill" display="block" onClick={handleJoin} disabled={joining}>
            참여하기
          </Button>
        </Card>
      )}

      {roomCode && loading && <LoadingState rows={5} testId="rank-skeleton" />}

      {roomCode && !loading && networkError && (
        <>
          {sortedEntries.length > 0 && (
            <Card testId="rank-list-card">
              {sortedEntries.map((entry) => (
                <RankRow key={entry.userId} entry={entry} isMe={entry.userId === profile.deviceUserId} />
              ))}
            </Card>
          )}
          <Spacing size={12} />
          <Paragraph.Text typography="t6" color="var(--adaptiveGrey700)">
            지금은 순위를 불러올 수 없어요
          </Paragraph.Text>
          <Spacing size={12} />
          <Button variant="weak" display="block" onClick={handleRetry}>
            다시 시도
          </Button>
        </>
      )}

      {roomCode && !loading && !networkError && soloOnly && (
        <EmptyState
          title="아직 친구가 없어요"
          description="내 초대 코드를 공유해보세요"
          testId="rank-empty"
        />
      )}

      {roomCode && !loading && !networkError && !soloOnly && (
        <Card testId="rank-list-card">
          {sortedEntries.map((entry) => (
            <RankRow key={entry.userId} entry={entry} isMe={entry.userId === profile.deviceUserId} />
          ))}
        </Card>
      )}

      <Spacing size={24} />
      <AdSlot adGroupId="rank-list-bottom" />
      <Spacing size={16} />

      <Toast open={!!toastText} text={toastText ?? ''} position="bottom" onClose={() => setToastText(null)} />
    </ScreenScaffold>
  );
}
