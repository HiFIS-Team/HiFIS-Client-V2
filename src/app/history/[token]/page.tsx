import type { Metadata, Viewport } from 'next';

import HistoryBoard from './HistoryBoard';
import './history.css';

export const metadata: Metadata = {
  title: '출석 이력',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

/**
 * 브로제이 출입 기록으로 만든 달별 출석 순위.
 *
 * 주소 마지막 칸이 `branches.history_token` 이다. **매장에 거는 화면이 아니라
 * 직원이 보는 자리다** — 회원 이름과 출석일이 줄줄이 뜬다.
 *
 * 설문 화면과 같은 이유로 **여기서 토큰이 맞는지 안 본다.** 값을 받아 보고
 * 실패하면 화면이 안내로 떨어진다 — 한 번 더 물어봐야 왕복만 는다.
 */
export default async function HistoryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <HistoryBoard token={token} />;
}
