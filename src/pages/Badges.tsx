import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Top, Paragraph, Spacing, Chip, BottomSheet, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_DEFS } from '@/lib/badgeDefs';
import type { BadgeId } from '@/lib/types';

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

export default function Badges() {
  const { earned } = useBadges();
  const location = useLocation();
  const highlightBadgeId = (location.state as { highlightBadgeId?: BadgeId } | null)?.highlightBadgeId ?? null;
  const [selectedId, setSelectedId] = useState<BadgeId | null>(highlightBadgeId);

  const earnedMap = useMemo(() => new Map(earned.map((b) => [b.id, b.earnedAt])), [earned]);
  const selected = BADGE_DEFS.find((def) => def.id === selectedId) ?? null;

  return (
    <ScreenScaffold
      top={
        <Top
          title={<Top.TitleParagraph>뱃지</Top.TitleParagraph>}
          right={<Chip>{`${BADGE_DEFS.length}개 중 ${earned.length}개`}</Chip>}
        />
      }
      bottom={<FloatingTabBar items={TAB_ITEMS} />}
    >
      <Spacing size={16} />

      <Card testId="badge-grid">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {BADGE_DEFS.map((def) => {
            const earnedAt = earnedMap.get(def.id);
            return (
              <button
                key={def.id}
                type="button"
                data-testid={`badge-${def.id}`}
                aria-label={def.name}
                onClick={() => {
                  try {
                    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
                  } catch {
                    /* WebView 밖 — 무시 */
                  }
                  setSelectedId(def.id);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 88,
                  padding: 8,
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  backgroundColor: earnedAt
                    ? 'var(--adaptiveBlue100)'
                    : 'var(--adaptiveGrey100)',
                  opacity: earnedAt ? 1 : 0.4,
                }}
              >
                <Paragraph.Text typography="t3">{earnedAt ? '★' : '☆'}</Paragraph.Text>
                <Paragraph.Text typography="st11">{def.name}</Paragraph.Text>
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
            <Paragraph.Text typography="st11">{selected.description}</Paragraph.Text>
            <Spacing size={8} />
            <Paragraph.Text typography="st11">
              {(() => {
                const earnedAt = earnedMap.get(selected.id);
                return earnedAt ? formatEarnedAt(earnedAt) : '조건을 채우면 열려요';
              })()}
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
