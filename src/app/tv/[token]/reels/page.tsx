import type { Metadata } from 'next';

import TvScreen from '../TvScreen';
import '../tv.css';

export const metadata: Metadata = {
  title: '피트니스스타',
  robots: { index: false, follow: false },
};

/**
 * 릴스용 추첨 화면 — **영상으로 찍어 인스타에 올리는 화면**이다.
 *
 * 매장 TV([../page.tsx])와 **같은 게임 · 같은 시드 · 같은 결과**를 쓴다.
 * 게임이 결정적이라 여기서 찍은 영상과 벽에 걸린 TV 가 완전히 같은 경기다.
 *
 * TV 와 다른 것은 셋뿐이다.
 *
 * | | 매장 TV | 릴스 |
 * |---|---|---|
 * | 전화 뒤 4자리 | 보여준다 | **뺀다** — 인스타는 아무나 본다 |
 * | 컴플레인 보드 | 아래에 깐다 | **뺀다** — 본문에 직원 이름이 들 수 있다 |
 * | 끝나면 | 20초 뒤 다시 튼다 | **한 바퀴로 끝난다** |
 *
 * 시작·끝을 렌더러가 잡는다 — `window.__reelsStart()` 를 부를 때까지 게임을
 * 안 틀고, 끝나면 `window.__reels.done` 이 참이 된다. 그래야 영상 앞뒤에
 * 빈 자리가 안 남는다.
 */
export default async function ReelsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TvScreen token={token} reels />;
}
