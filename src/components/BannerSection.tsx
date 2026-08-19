import { Spacing } from '@toss/tds-mobile';
import { AdSlot } from '@/components/AdSlot';

interface BannerSectionProps {
  /** 위쪽 콘텐츠와 띄울 간격. 기본 24 */
  gap?: number;
}

/**
 * 배너 광고 배치 래퍼 — 콘텐츠 사이/하단에만 놓는다.
 *
 * 광고 그룹 ID(VITE_TOSS_AD_GROUP_ID)가 없으면 아무것도 렌더하지 않는다.
 * 콘솔에 ID를 등록하기 전(개발·검수 환경)에 빈 회색 영역이 콘텐츠를 밀어내는 걸 막기 위함.
 *
 * @AI:NOTE 콘텐츠 위나 CTA 위에 두지 마라 — 광고가 주요 동선을 가리면 검수에서 반려된다.
 */
export function BannerSection({ gap = 24 }: BannerSectionProps = {}) {
  const adGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;
  if (!adGroupId) return null;

  return (
    <>
      <Spacing size={gap} />
      <AdSlot adGroupId={adGroupId} />
    </>
  );
}
