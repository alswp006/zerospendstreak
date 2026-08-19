import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { Top, Paragraph, Spacing, Chip, BottomSheet, Button, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_DEFS } from '@/lib/badgeDefs';
import type { BadgeDef, BadgeId, RouteState } from '@/lib/types';

const TAB_ITEMS = [
  { label: '홈', path: '/' },
  { label: '달력', path: '/calendar' },
  { label: '통계', path: '/stats' },
  { label: '뱃지', path: '/badges' },
  { label: '랭킹', path: '/rank' },
];

function formatEarnedAt(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 획득`;
}

function conditionText(def: BadgeDef): string {
  if (def.kind === 'streak') return `연속 ${def.threshold}일 달성 시 획득`;
  if (def.kind === 'total') return `누적 ${def.threshold}일 달성 시 획득`;
  return '복구권을 사용하면 획득';
}

export default function Badges() {
  const { earned } = useBadges();
  const location = useLocation();
  const routeState = (location.state as RouteState['/badges']) ?? undefined;
  const [selectedId, setSelectedId] = useState<BadgeId | null>(routeState?.highlightBadgeId ?? null);

  const earnedMap = useMemo(() => new Map(earned.map((b) => [b.id, b.earnedAt])), [earned]);
  const selected = BADGE_DEFS.find((def) => def.id === selectedId) ?? null;
  const selectedEarnedAt = selected ? earnedMap.get(selected.id) : undefined;

  const openBadge = (id: BadgeId) => {
    try {
      Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
    } catch {
      /* WebView 밖 — 무시 */
    }
    // 사전 작성된 테스트가 RTL의 fireEvent가 아닌 raw DOM .click()을 사용 —
    // React 18 자동 배칭 하에서는 act() 밖의 네이티브 클릭이 동기 flush를 보장하지
    // 않으므로 flushSync로 강제한다.
    flushSync(() => setSelectedId(id));
  };

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>뱃지</Top.TitleParagraph>}
          right={<Chip>{`${BADGE_DEFS.length}개 중 ${earned.length}개 획득`}</Chip>}
        />
      }
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <Spacing size={16} />

      {earned.length === 0 && (
        <>
          <Card>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Asset.ContentIcon name="iconBadgeRegular" alt="아직 뱃지가 없어요" />
              <Paragraph.Text typography="t5">아직 뱃지가 없어요</Paragraph.Text>
              <Paragraph.Text typography="st11" color="secondary">
                체크인을 이어가면 뱃지가 열려요
              </Paragraph.Text>
            </div>
          </Card>
          <Spacing size={16} />
        </>
      )}

      <Card testId="badge-grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BADGE_DEFS.map((def) => {
            const isEarned = earnedMap.has(def.id);
            const isOpenInSheet = selectedId === def.id;
            return (
              <button
                key={def.id}
                type="button"
                data-testid={`badge-${def.id}`}
                aria-label={def.name}
                onClick={() => openBadge(def.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 88,
                  minWidth: 44,
                  padding: 8,
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  backgroundColor: isEarned ? 'var(--adaptiveBlue100)' : 'var(--adaptiveGrey100)',
                  opacity: isEarned ? 1 : 0.4,
                }}
              >
                <Asset.ContentIcon
                  name={isEarned ? 'iconBadgeFilled' : 'iconBadgeRegular'}
                  alt={def.name}
                />
                {/* 이 셀의 BottomSheet가 열려 있는 동안엔 이름을 숨긴다 —
                   시트에도 같은 이름이 t4로 보이므로 중복 노출을 피한다. */}
                {!isOpenInSheet && (
                  <Paragraph.Text typography="st11" color={isEarned ? undefined : 'tertiary'}>
                    {def.name}
                  </Paragraph.Text>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Spacing size={24} />

      <BottomSheet open={selected !== null} onClose={() => setSelectedId(null)}>
        {selected ? (
          <div style={{ padding: 16 }}>
            <Paragraph.Text typography="t4">{selected.name}</Paragraph.Text>
            <Spacing size={8} />
            <Paragraph.Text typography="st11" color="secondary">
              {selected.description}
            </Paragraph.Text>
            <Spacing size={8} />
            <Paragraph.Text typography="st11">
              {selectedEarnedAt ? formatEarnedAt(selectedEarnedAt) : conditionText(selected)}
            </Paragraph.Text>
            <Spacing size={16} />
            <Button variant="weak" display="block" onClick={() => setSelectedId(null)}>
              닫기
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </ScreenScaffold>
  );
}
