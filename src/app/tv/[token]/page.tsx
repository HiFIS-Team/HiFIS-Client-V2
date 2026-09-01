import type { Metadata } from 'next';

import TvScreen from './TvScreen';
import './tv.css';

export const metadata: Metadata = {
  title: '피트니스스타',
  robots: { index: false, follow: false },
};

/**
 * 매장 TV — **추첨과 컴플레인이 한 바퀴를 돈다** (2026-09-01 대표 요청).
 *
 * 달마다 게임(핀볼·사다리·룰렛)이 굴러가 당첨자를 띄우고, 그 아래에 해결된
 * 컴플레인이 깔린다. 20초 뒤 다시 게임이다. 그 달 추첨이 없으면 예전처럼
 * 컴플레인만 보여준다.
 *
 * 지점마다 주소가 하나씩이고(`branches.tv_token`), TV 브라우저를 전체화면으로
 * 띄워 두면 된다. 세로(9:16)로 세운 화면 기준이다.
 */
export default async function TvPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TvScreen token={token} />;
}
