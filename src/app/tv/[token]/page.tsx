import type { Metadata } from 'next';

import TvScreen from './TvScreen';
import './tv.css';

export const metadata: Metadata = {
  title: '피트니스스타',
  robots: { index: false, follow: false },
};

/**
 * 주소로 받는 회전 각 — **OS 가 화면을 못 돌리는 기기용**이다 (2026-09-08).
 *
 * 구글 TV(안드로이드 TV)는 화면 회전 설정이 아예 없다. 폰·태블릿은 중력
 * 센서로 도는데 TV 에는 그게 없어서, 벽에 세로로 걸어도 프레임버퍼가 계속
 * 가로(1920×1080)로 나간다 — 그림만 옆으로 누워 보인다. 브라우저를 바꿔도
 * 같다. 그래서 **페이지가 대신 돈다.**
 *
 * 어느 쪽으로 걸었는지는 우리가 알 수 없으니 둘 다 둔다. `90` 으로 열어 보고
 * 거꾸로면 `270` 이다.
 *
 * **없으면 안 돌린다** — 기존 주소로 들어오는 화면은 하나도 안 바뀐다.
 */
const TURNS = new Set(['90', '270']);

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
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token } = await params;
  const { rotate } = await searchParams;
  const turn = typeof rotate === 'string' && TURNS.has(rotate) ? rotate : null;

  const screen = <TvScreen token={token} />;
  return turn ? <div className={`rot rot${turn}`}>{screen}</div> : screen;
}
