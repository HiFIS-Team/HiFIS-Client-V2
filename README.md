# HiFIS-Client-V2

> [ HiFIS-V2 ｜ Client ] 피트니스스타 직원 관리 플랫폼

피트니스스타의 직원을 관리하기 위한 관리자용 웹 클라이언트입니다.
백엔드 연동 전이라 현재는 목(mock) 데이터를 기반으로 프론트엔드를 먼저 구축하고 있습니다.

## 기술 스택

| 구분 | 기술 |
| --- | --- |
| 프레임워크 | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| 언어 | [TypeScript](https://www.typescriptlang.org/) |
| UI 라이브러리 | [React 19](https://react.dev/) |
| 스타일링 | [Tailwind CSS v4](https://tailwindcss.com/) |
| 린트 | [ESLint 9](https://eslint.org/) |
| 패키지 매니저 | [pnpm](https://pnpm.io/) |

## 요구 사항

- [Node.js](https://nodejs.org/) 20 이상 (LTS 권장)
- [pnpm](https://pnpm.io/installation) 9 이상

## 시작하기

```bash
# 1. 의존성 설치
pnpm install

# 2. 개발 서버 실행
pnpm dev
```

개발 서버 실행 후 브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속합니다.

## 스크립트

| 명령어 | 설명 |
| --- | --- |
| `pnpm dev` | 개발 서버 실행 (Turbopack) |
| `pnpm build` | 프로덕션 빌드 |
| `pnpm start` | 프로덕션 서버 실행 (빌드 후) |
| `pnpm lint` | ESLint 검사 |

## 프로젝트 구조

```
src/
  app/               # App Router 엔트리
    layout.tsx       # 루트 레이아웃
    page.tsx         # 시작 페이지
    globals.css      # 전역 스타일 (Tailwind)
public/              # 정적 에셋
```

- import alias: `@/*` → `src/*`
