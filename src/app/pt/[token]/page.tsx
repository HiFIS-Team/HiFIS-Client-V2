import type { Metadata, Viewport } from 'next';

import PtForm from './PtForm';
import './pt.css';

export const metadata: Metadata = {
  title: '수업 어떠셨나요?',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

/**
 * PT 만족도 폼 — 신규 회원 **7회차**에 문자로 가는 화면.
 *
 * 주소 마지막 칸이 `pt_surveys.token` 이다. 회원 한 명·등록권 하나에 걸린
 * 링크라, **한 번 내면 다시 못 낸다** (문자에 링크가 남아 있어서 안 막으면
 * 같은 사람이 여러 번 눌러 값이 덮인다).
 */
export default async function PtPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PtForm token={token} />;
}
