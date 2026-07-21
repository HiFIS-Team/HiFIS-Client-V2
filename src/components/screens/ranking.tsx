"use client";

import { useState } from "react";

/**
 * 랭킹
 *
 * 업무 5탭의 점수를 직원끼리 겨루는 화면(레퍼런스 리더보드 스타일 → 다크 퍼플로 적응).
 * 탭(카테고리)별로 순위가 다시 매겨짐: 종합 · 친절왕 · 수업 · 기여도 · 환경정비.
 * 리그 카드 → 시상대 TOP3 → 내 순위 → 4위부터 목록.
 * ⚠️ km이 아니라 점(点). 현재 목(로컬 데이터). 내 위치는 각 직원의 `me` 플래그로 표시.
 */

// 랭킹은 3개만: 피드백왕(동료평가) · 친절왕(회원 친절도) · 종합왕(전체 합)
type CatKey = "review" | "kind" | "total";
const CATS: { key: CatKey; label: string }[] = [
  { key: "review", label: "피드백왕" },
  { key: "kind", label: "친절왕" },
  { key: "total", label: "종합왕" },
];

type Emp = {
  name: string;
  me?: boolean;
  trend: number; // 순위 변동 (+상승 / -하락 / 0)
  review: number; // 동료평가(피드백)
  kind: number; // 회원 친절도
  class: number; // 수업 개수
  contrib: number; // 센터 기여도
  env: number; // 환경정비
};

// 은후(나)의 kind30·class8·contrib21은 실제 업무 탭 점수와 맞춤(수업 4회×2, 칭찬 3×10, 기여 5+6+10)
const EMPLOYEES: Emp[] = [
  { name: "김준호", trend: 0, review: 40, kind: 45, class: 40, contrib: 35, env: 35 },
  { name: "이서연", trend: 1, review: 48, kind: 50, class: 35, contrib: 33, env: 30 },
  { name: "박도윤", trend: -1, review: 35, kind: 38, class: 45, contrib: 30, env: 27 },
  { name: "최민지", trend: 2, review: 42, kind: 40, class: 30, contrib: 28, env: 22 },
  { name: "정예찬", trend: 0, review: 30, kind: 30, class: 38, contrib: 22, env: 20 },
  { name: "은후", me: true, trend: 3, review: 45, kind: 30, class: 8, contrib: 21, env: 40 },
  { name: "오수빈", trend: 1, review: 28, kind: 28, class: 32, contrib: 18, env: 14 },
  { name: "윤서아", trend: -2, review: 38, kind: 33, class: 22, contrib: 18, env: 12 },
  { name: "강태오", trend: 0, review: 25, kind: 20, class: 30, contrib: 16, env: 12 },
  { name: "한지우", trend: -1, review: 33, kind: 35, class: 15, contrib: 12, env: 8 },
];

// 종합 = 전 점수 합 / 나머지는 해당 항목
const scoreOf = (e: Emp, cat: CatKey) =>
  cat === "total" ? e.review + e.kind + e.class + e.contrib + e.env : e[cat];

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc", "#f43f5e"];
const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
    </svg>
  );
}
function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.6 1.3-3.4C8.5 8.5 9 10 9.6 10.3 10.4 8 12 6.5 12 2Z" />
    </svg>
  );
}

// 순위 변동 화살표
function Trend({ n }: { n: number }) {
  if (n === 0) return <span className="text-[11px] text-fg-muted/60">–</span>;
  const up = n > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${up ? "text-emerald-400" : "text-red-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(n)}
    </span>
  );
}

function Avatar({ name, size, me }: { name: string; size: string; me?: boolean }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full font-bold text-white ${me ? "ring-2 ring-primary ring-offset-2 ring-offset-bg" : ""}`}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {name[0]}
    </span>
  );
}

const PERIODS = ["이번 달", "지난 달", "전체"];

export function Ranking() {
  const [cat, setCat] = useState<CatKey>("total");
  const [periodIdx, setPeriodIdx] = useState(0);

  const ranked = [...EMPLOYEES].sort((a, b) => scoreOf(b, cat) - scoreOf(a, cat));
  const total = ranked.length;
  const myIdx = ranked.findIndex((e) => e.me);
  const me = ranked[myIdx];
  const myRank = myIdx + 1;
  const myScore = scoreOf(me, cat);
  const myPct = Math.max(1, Math.round((myRank / total) * 100));

  // 바로 위와의 점수 차
  const above = myIdx > 0 ? ranked[myIdx - 1] : null;
  const gap = above ? scoreOf(above, cat) - myScore : 0;

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2 · 1 · 3
  const PEDESTAL = [
    { h: "h-24", grad: "from-white/12 to-white/[0.03]", border: "border-white/15", num: "text-fg-muted" },
    { h: "h-32", grad: "from-amber-400/25 to-amber-400/[0.04]", border: "border-amber-400/30", num: "text-amber-300" },
    { h: "h-20", grad: "from-amber-700/25 to-amber-700/[0.04]", border: "border-amber-700/30", num: "text-amber-600" },
  ];
  const RANK_OF = [2, 1, 3];
  const AV_SIZE = ["h-14 w-14 text-base", "h-[70px] w-[70px] text-xl", "h-14 w-14 text-base"];

  return (
    <div className="px-4 pb-8 pt-5">
      {/* 헤더 (제목 통일: 소분류 + 제목). 지점 통합 랭킹이라 지점 표기 없음. */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-fg-muted">인사·급여</p>
          <h1 className="text-xl font-bold">랭킹</h1>
        </div>
        <button
          type="button"
          onClick={() => setPeriodIdx((i) => (i + 1) % PERIODS.length)}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-surface px-2.5 py-1 text-xs font-semibold text-fg-muted"
        >
          <CalendarIcon className="h-3.5 w-3.5" /> {PERIODS[periodIdx]}
        </button>
      </div>

      {/* 카테고리 탭 (밑줄, 가운데 정렬 — 3개) */}
      <div className="mt-4 flex justify-center gap-9 border-b border-white/10">
        {CATS.map((c) => {
          const on = cat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={`relative pb-2.5 text-sm transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
            >
              {c.label}
              {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* 시상대 TOP 3 */}
      <div className="mt-6 flex items-end gap-2">
        {podiumOrder.map((e, i) => {
          const ped = PEDESTAL[i];
          return (
            <div key={e.name} className="flex flex-1 flex-col items-center">
              {i === 1 && <span className="mb-1 text-xl leading-none">👑</span>}
              <Avatar name={e.name} size={AV_SIZE[i]} me={e.me} />
              <p className="mt-1.5 max-w-full truncate text-sm font-bold">{e.name}</p>
              <p className="text-xs font-semibold text-primary-bright tabular-nums">{scoreOf(e, cat)}점</p>
              <div className={`mt-1.5 flex w-full ${ped.h} items-start justify-center rounded-t-lg border-x border-t bg-gradient-to-b ${ped.grad} ${ped.border} pt-2`}>
                <span className={`text-3xl font-bold ${ped.num}`}>{RANK_OF[i]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 내 순위 카드 */}
      <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.name} size="h-11 w-11 text-sm" me />
          <div className="flex-1">
            <p className="text-[11px] text-fg-muted">내 순위</p>
            <p className="text-sm font-bold">상위 {myPct}%</p>
          </div>
          <p className="text-3xl font-bold tabular-nums">
            {myRank}
            <span className="ml-0.5 text-base font-semibold text-fg-muted">위</span>
          </p>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-xs">
          <FlameIcon className="h-3.5 w-3.5 text-orange-400" />
          {above ? (
            <span className="text-fg-muted">
              <span className="font-semibold text-fg">{gap}점</span> 더 얻으면 {myRank - 1}위
            </span>
          ) : (
            <span className="font-semibold text-fg">1위예요! 🎉</span>
          )}
        </div>
      </div>

      {/* 4위부터 목록 */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-surface divide-y divide-white/5">
        {rest.map((e, i) => {
          const rank = i + 4;
          return (
            <div key={e.name} className={`flex items-center gap-3 px-4 py-2.5 ${e.me ? "bg-primary/10" : ""}`}>
              <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-fg-muted">{rank}</span>
              <Avatar name={e.name} size="h-9 w-9 text-sm" me={e.me} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {e.name}
                {e.me && <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">나</span>}
              </span>
              <Trend n={e.trend} />
              <span className="w-12 shrink-0 text-right text-sm font-bold text-primary-bright tabular-nums">{scoreOf(e, cat)}점</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
