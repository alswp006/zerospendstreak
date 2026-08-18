import { Top, Paragraph, Spacing, ListRow, Button } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';

/**
 * Golden Home page — 대시보드/탭-루트 골든 레퍼런스.
 *
 * 다른 페이지를 쓸 때 이 패턴을 모방하라:
 * - ScreenScaffold로 감싼다(raw fragment 골격 금지) — safe-area + 100dvh 자동 처리.
 * - 화면 최상단에 SummaryHero로 시각 앵커를 만든다('휑함'의 가장 큰 원인은 앵커 부재).
 *   데이터가 있으면 value에 <Amount value={n} unit="원" typography="t1" />로 핵심 숫자를 크게 박아라.
 * - 1차 진입 액션은 SummaryHero 카드 내부 버튼(display="block", 전체폭)에 둔다.
 *   → 화면 중앙 부유/좌측 글자폭 버튼 금지. 하단 TabBar가 있으면 SubmitFooter와 겹치므로 카드 안에.
 * - 핵심 정보는 raw <div>가 아니라 Card로 묶어 위계를 만든다.
 * - 하단 탭이 필요하면(2~5탭): bottom={<FloatingTabBar items={[{label,path}...]} />}.
 *   ('TDS TabBar'는 존재하지 않는다 — 직접 만들지 말고 FloatingTabBar를 써라.)
 * - 카피는 CLAUDE.md "카피 규칙 — AI 냄새 금지"를 따른다: 기능 나열식 홍보 문구·상투구·
 *   generic 버튼("시작하기") 금지.
 */

const HIGHLIGHTS = [
  { title: '오늘', description: '아직 기록이 없어요 · 위 버튼으로 체크인하세요' },
  { title: '이번 주', description: '기록 3건 · 평균 12분' },
];

/** 주요 CTA 햅틱 가드 — SDK는 WebView 밖에서 throw하므로 무음 처리. */
function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* 브라우저/검수자 PC/jsdom에서는 throw — 무시 */
  }
}

export default function Home() {
  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>ZeroSpendStreak</Top.TitleParagraph>} />}
    >
      {/* 시각 앵커: 헤드라인 + 카드 내 진입 버튼(부유 금지, display="block" 전체폭).
          데이터 앱이면 value를 <Amount typography="t1" />(핵심 숫자)로 교체하라. */}
      <SummaryHero
        label="ZeroSpendStreak"
        value={<Paragraph.Text typography="t2">오늘 하루 무지출에 도전해요</Paragraph.Text>}
        caption="로그인 없이 바로 기록할 수 있어요"
        action={
          <Button variant="fill" display="block" onClick={() => fireHaptic('success')}>
            오늘 체크인
          </Button>
        }
        testId="home-hero"
      />

      <Spacing size={24} />

      {/* 핵심 정보는 Card로 묶기(raw div 금지) — 위계 생성 */}
      <Card testId="home-highlights">
        {HIGHLIGHTS.map((h, idx) => (
          <ListRow
            key={idx}
            contents={<ListRow.Texts type="2RowTypeA" top={h.title} bottom={h.description} />}
          />
        ))}
      </Card>

      <Spacing size={24} />
    </ScreenScaffold>
  );
}
