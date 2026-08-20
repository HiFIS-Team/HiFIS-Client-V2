# HiFIS-Client-V2

[ HiFIS-V2ㅣClient ] 피트니스스타 직원 관리 플랫폼

`hifis.app` — 회원이 보는 웹 화면입니다. 로그인이 없습니다.

## 기술 스택

- [Next.js](https://nextjs.org) 16 (App Router)
- React 19 · TypeScript 5

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

## 스크립트

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 빌드 결과 실행 |
| `npm run lint` | 린트 |
| `npm run typecheck` | 타입 검사 |

## 환경 변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.hifis.app` | API 서버 주소 |

기본값이 운영이라 배포할 때는 설정하지 않아도 됩니다.
로컬 API 서버를 볼 때만 `.env.example` 을 `.env.local` 로 복사해서 씁니다.

```bash
cp .env.example .env.local
```

## 라우트

| 경로 | 화면 |
|---|---|
| `/survey/{token}` | 회원 친절도 설문 (매장 QR) |
| `/tv/{token}` | 매장 TV — 해결된 컴플레인 |
| `/pt/{token}` | PT 만족도 폼 (7회차 문자 링크) |

`token` 은 서버가 발급합니다.

## 폴더 구조

```
src/
  app/
    layout.tsx              루트 레이아웃
    page.tsx                /
    survey/[token]/         설문
    tv/[token]/             매장 TV
    pt/[token]/             PT 만족도 폼
  lib/
    api.ts                  API 호출·타입
```

화면별 CSS 는 각 라우트 폴더 안에 있습니다.

## 관련 레포

| | |
|---|---|
| [HiFIS-Server-V2](https://github.com/HiFIS-Team/HiFIS-Server-V2) | API 서버 (FastAPI) |
| [HiFIS-App-V2](https://github.com/HiFIS-Team/HiFIS-App-V2) | 직원용 앱 (Flutter) |

## 브랜치

작업과 커밋은 `develop` 에서 합니다. `main` 은 머지할 때만 씁니다.
