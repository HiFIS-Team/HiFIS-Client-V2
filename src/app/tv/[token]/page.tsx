import type { Metadata } from 'next';

import TvBoard from './TvBoard';
import './tv.css';

export const metadata: Metadata = {
  title: '피트니스스타',
  robots: { index: false, follow: false },
};

/**
 * 매장 TV — 해결된 컴플레인을 돌려 보여주는 화면.
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
  return <TvBoard token={token} />;
}
