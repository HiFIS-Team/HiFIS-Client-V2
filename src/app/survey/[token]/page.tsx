import type { Metadata, Viewport } from 'next';

import SurveyForm from './SurveyForm';
import './survey.css';

export const metadata: Metadata = {
  title: '오늘 어떠셨나요?',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

/**
 * 매장 QR 로 들어오는 회원 친절도 설문.
 *
 * 주소 마지막 칸이 `branches.survey_token` 이다 (지점 id 가 아니다 — 새면
 * 갈아 끼운다). **여기서는 토큰이 맞는지 안 본다** — 명단을 받아 보고
 * 실패하면 화면이 '설문을 열 수 없어요' 로 떨어진다. 서버가 이미 404 를
 * 주므로 여기서 한 번 더 물어봐야 왕복만 는다.
 */
export default async function SurveyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SurveyForm token={token} />;
}
