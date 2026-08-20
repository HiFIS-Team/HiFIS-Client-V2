import type { Metadata } from 'next';

/**
 * 루트 껍데기 — **여기서는 스타일을 안 건다.**
 *
 * 설문(폰)과 TV(9:16 벽걸이)가 `body` 에 정반대 규칙을 건다 —
 * 설문은 스크롤이 필요하고 TV 는 `overflow:hidden` 에 커서까지 숨긴다.
 * 그래서 각 화면이 자기 CSS 를 자기 라우트에서 들고 온다
 * (Next 가 라우트별로 CSS 를 갈라 실어서 서로 안 섞인다).
 *
 * Pretendard 만 여기서 받는다 — 두 화면이 같이 쓴다.
 */
export const metadata: Metadata = {
  title: '피트니스스타',
  // 매장에 붙는 QR·TV 주소다. 검색에 걸릴 이유가 없다
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
