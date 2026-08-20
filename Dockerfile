# 회원 화면 (Next.js) — 홈서버 배포용
#
# `careers` 앱과 **같은 방식**이다 (같은 서버에서 도는 Next.js 라 굳이 다르게
# 할 이유가 없다). 다른 점은 DB 도 Prisma 도 없다는 것뿐 — 이 앱은 값을
# `api.hifis.app` 에서 받아 그리기만 한다.
FROM node:22-bookworm-slim

WORKDIR /app

# 의존성 먼저 — 소스만 바뀌었을 때 이 층을 다시 안 받는다
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

# `-H 0.0.0.0` 이라야 컨테이너 밖(nginx)에서 닿는다
CMD ["sh", "-c", "node_modules/.bin/next start -H 0.0.0.0 -p 3002"]
