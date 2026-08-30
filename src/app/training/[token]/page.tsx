import type { Metadata, Viewport } from 'next';

import TrainingBoard from './TrainingBoard';
import './training.css';

export const metadata: Metadata = {
  title: '내 수업',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F2F4F6',
};

/**
 * 회원이 자기 수업을 보는 화면.
 *
 * 주소 마지막 칸이 `members.training_token` 이다 — 트레이너가 앱에서 복사해
 * 회원에게 보내 주는 주소다. **로그인이 없다.**
 *
 * 앱은 트레이너 쪽, 여기는 회원 쪽이다. 그래서 할 수 있는 일이 다르다.
 * - PT 일지: **읽기만** (회차 기록은 트레이너가 쓴다)
 * - 개인 운동: 직접 적고 고친다 — 단 **트레이너 피드백 칸은 없다**
 *
 * 다른 공개 화면과 같은 이유로 **여기서 토큰이 맞는지 안 본다.** 값을 받아
 * 보고 실패하면 화면이 안내로 떨어진다 — 한 번 더 물어봐야 왕복만 는다.
 */
export default async function TrainingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TrainingBoard token={token} />;
}
