import type { Metadata, Viewport } from 'next';

import OtForm from './OtForm';
import '../../survey/[token]/survey.css';
import './ot.css';

export const metadata: Metadata = {
  title: 'OT 신청',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

/**
 * OT 신청 — 네이버 플레이스 링크·전단지 QR 로 들어온다 (2026-09-28 대표 요청).
 *
 * 주소 마지막 칸은 회원 설문과 같은 `branches.survey_token` 이다 — 지점마다
 * 토큰 하나로 설문(`/survey/…`)과 OT(`/ot/…`)가 갈린다. 모양은 회원 설문을
 * 그대로 쓴다 (`survey.css`) — 매장 QR 두 장이 다른 앱처럼 보이면 안 된다.
 */
export default async function OtPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OtForm token={token} />;
}
