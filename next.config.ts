import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // Next 가 루트에 AGENTS.md·CLAUDE.md 를 만드는 것을 끈다 —
  // 이 레포의 규칙은 `.claude/claude.md` 에 손으로 적는다 (서버·앱 레포와 같은 자리)
  agentRules: false,
};

export default config;
