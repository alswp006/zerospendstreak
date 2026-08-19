import { Component, type ReactNode } from 'react';
import { Asset, Button, Paragraph, Spacing } from '@toss/tds-mobile';

interface EmptyStateProps {
  /** Asset.ContentIcon 이름 */
  iconName: string;
  title: string;
  description?: string;
  /** 있으면 보조 CTA를 전체폭으로 렌더 */
  actionLabel?: string;
  onAction?: () => void;
  testId?: string;
}

/**
 * Asset.ContentIcon은 아이콘을 CDN에서 받아온다 — 응답이 실패하면(오프라인·차단)
 * 컴포넌트가 throw하고 라우트 전체가 죽는다. 아이콘 하나 때문에 화면이 사라지지
 * 않도록 여기서 삼키고 제목·설명만 남긴다.
 * @AI:WARN 이 경계를 빼지 마라.
 */
class IconBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/**
 * 빈 목록 안내 — 아이콘 + 제목 + 설명(선택) + 보조 CTA(선택).
 *
 * 목록이 비었을 때 맨텍스트("데이터 없음") 대신 쓴다. 하단 고정 1차 CTA와 같은
 * 라벨을 중복으로 걸지 마라.
 * (ReactNode 슬롯을 직접 조립하고 싶으면 `@/components/StateView`의 EmptyState를 쓴다.)
 */
export function EmptyState({
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  testId,
}: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '48px 24px',
      }}
    >
      <IconBoundary>
        <Asset.ContentIcon name={iconName} alt="" style={{ width: 48, height: 48 }} />
      </IconBoundary>
      <Spacing size={12} />
      <Paragraph.Text typography="t4">{title}</Paragraph.Text>
      {description ? (
        <>
          <Spacing size={4} />
          <Paragraph.Text typography="st11" color="secondary">
            {description}
          </Paragraph.Text>
        </>
      ) : null}
      {actionLabel ? (
        <>
          <Spacing size={20} />
          <div style={{ width: '100%' }}>
            <Button variant="weak" size="large" display="block" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
