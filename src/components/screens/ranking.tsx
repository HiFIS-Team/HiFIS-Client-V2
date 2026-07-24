"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth";
import { getRanking, type RankingItem, type RankingKind } from "@/lib/api/hifis";

/**
 * 랭킹 — **백엔드 연동**.
 *
 * 업무 점수(ScoreEvent)를 직원끼리 겨루는 화면. `/scores/ranking`이 이름+점수를 직접 준다
 * (→ 직원 명단 권한 갭에 안 걸림). 지점 스코프. ⚠️ km이 아니라 점(点).
 * 5부문(kind): 종합왕(생략=전 점수 합) · 매출왕(SALES) · 수업왕(CLASS) · 친절왕(KINDNESS) · 피드백왕(PEER).
 * ⚠️ 매출왕은 category=CONTRIB 아님 — kind=SALES 전용 필터(아이디어·목표·근무외출근 제외).
 */

type CatKey = "total" | "sales" | "class" | "kind" | "review";
const CATS: { key: CatKey; label: string; kind?: RankingKind }[] = [
  { key: "total", label: "종합왕" }, // kind 생략 = OVERALL(전 점수 합)
  { key: "sales", label: "매출왕", kind: "SALES" },
  { key: "class", label: "수업왕", kind: "CLASS" },
  { key: "kind", label: "친절왕", kind: "KINDNESS" },
  { key: "review", label: "피드백왕", kind: "PEER" },
];

const PERIODS = ["이번 달", "지난 달", "전체"];
// periodIdx → "2026-07" | undefined(전체). new Date()는 여기(호출부)서만 — 렌더 아님.
function periodFor(idx: number): string | undefined {
  if (idx === 2) return undefined;
  const d = new Date();
  if (idx === 1) d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

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

export function Ranking() {
  const { user } = useAuth();
  const meId = user?.id;
  const isAdmin = user?.role === "ADMIN"; // 대표는 랭킹 대상 아님 → 내 순위 카드 숨김(순수 리더보드)
  const [cat, setCat] = useState<CatKey>("total");
  const [periodIdx, setPeriodIdx] = useState(0);

  const [ranked, setRanked] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // cat·기간 바뀌면 재조회 — 효과 본문 동기 setState 없이 .then 체인
  useEffect(() => {
    let alive = true;
    const apiKind = CATS.find((c) => c.key === cat)?.kind;
    getRanking({ kind: apiKind, period: periodFor(periodIdx) })
      .then((rows) => {
        if (alive) setRanked(rows);
      })
      .catch(() => {
        if (alive) setRanked([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cat, periodIdx]);

  const total = ranked.length;
  const myIdx = ranked.findIndex((e) => e.employeeId === meId);
  const me = myIdx >= 0 ? ranked[myIdx] : null;
  const myRank = myIdx + 1;
  const myPct = total > 0 && me ? Math.max(1, Math.round((myRank / total) * 100)) : 0;
  const above = myIdx > 0 ? ranked[myIdx - 1] : null;
  const gap = above && me ? above.points - me.points : 0;

  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);
  const PEDESTAL = [
    { h: "h-24", grad: "from-white/12 to-white/[0.03]", border: "border-white/15", num: "text-fg-muted" },
    { h: "h-32", grad: "from-amber-400/25 to-amber-400/[0.04]", border: "border-amber-400/30", num: "text-amber-300" },
    { h: "h-20", grad: "from-amber-700/25 to-amber-700/[0.04]", border: "border-amber-700/30", num: "text-amber-600" },
  ];
  const AV_SIZE = ["h-14 w-14 text-base", "h-[70px] w-[70px] text-xl", "h-14 w-14 text-base"];
  // 시상대 배치: [2위, 1위, 3위]
  const podium = [
    { emp: top3[1], place: 2, i: 0 },
    { emp: top3[0], place: 1, i: 1 },
    { emp: top3[2], place: 3, i: 2 },
  ];

  return (
    <div className="px-4 pb-8 pt-5">
      <div className="flex items-start justify-between">
        <h1 className="text-xl font-bold">랭킹</h1>
        <button
          type="button"
          onClick={() => setPeriodIdx((i) => (i + 1) % PERIODS.length)}
          className="flex items-center gap-1 rounded-full border border-white/10 bg-surface px-2.5 py-1 text-xs font-semibold text-fg-muted"
        >
          <CalendarIcon className="h-3.5 w-3.5" /> {PERIODS[periodIdx]}
        </button>
      </div>

      {/* 카테고리 탭 */}
      <div className="mt-4 flex border-b border-white/10">
        {CATS.map((c) => {
          const on = cat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={`relative flex-1 pb-2.5 text-center text-[13px] transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
            >
              {c.label}
              {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-fg-muted">불러오는 중…</p>
      ) : total === 0 ? (
        <p className="mt-8 rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          이 부문은 아직 점수가 없어요.
        </p>
      ) : (
        <>
          {/* 시상대 TOP 3 */}
          <div className="mt-6 flex items-end gap-2">
            {podium.map(({ emp, place, i }) => {
              const ped = PEDESTAL[i];
              return (
                <div key={place} className="flex flex-1 flex-col items-center">
                  {place === 1 && emp && <span className="mb-1 text-xl leading-none">👑</span>}
                  {emp ? (
                    <>
                      <Avatar name={emp.name} size={AV_SIZE[i]} me={emp.employeeId === meId} />
                      <p className="mt-1.5 max-w-full truncate text-sm font-bold">{emp.name}</p>
                      <p className="text-xs font-semibold text-primary-bright tabular-nums">{emp.points}점</p>
                    </>
                  ) : (
                    <>
                      <span className={`grid ${AV_SIZE[i]} shrink-0 place-items-center rounded-full bg-white/5 font-bold text-fg-muted`}>–</span>
                      <p className="mt-1.5 text-sm font-bold text-fg-muted">—</p>
                      <p className="text-xs text-fg-muted tabular-nums">0점</p>
                    </>
                  )}
                  <div className={`mt-1.5 flex w-full ${ped.h} items-start justify-center rounded-t-lg border-x border-t bg-gradient-to-b ${ped.grad} ${ped.border} pt-2`}>
                    <span className={`text-3xl font-bold ${ped.num}`}>{place}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 내 순위 카드 — 어드민(대표)은 랭킹 대상이 아니라 숨김 */}
          {!isAdmin && (
          <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name ?? "나"} size="h-11 w-11 text-sm" me />
              <div className="flex-1">
                <p className="text-[11px] text-fg-muted">내 순위</p>
                <p className="text-sm font-bold">{me ? `상위 ${myPct}%` : "이 부문 미참여"}</p>
              </div>
              {me ? (
                <p className="text-3xl font-bold tabular-nums">
                  {myRank}
                  <span className="ml-0.5 text-base font-semibold text-fg-muted">위</span>
                </p>
              ) : (
                <p className="text-sm font-semibold text-fg-muted">0점</p>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 border-t border-white/10 pt-2.5 text-xs">
              <FlameIcon className="h-3.5 w-3.5 text-orange-400" />
              {!me ? (
                <span className="text-fg-muted">아직 점수가 없어요. 업무를 수행해 점수를 쌓아보세요.</span>
              ) : above ? (
                <span className="text-fg-muted">
                  <span className="font-semibold text-fg">{gap}점</span> 더 얻으면 {myRank - 1}위
                </span>
              ) : (
                <span className="font-semibold text-fg">1위예요! 🎉</span>
              )}
            </div>
          </div>
          )}

          {/* 4위부터 목록 */}
          {rest.length > 0 && (
            <div className="mt-3 divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-surface">
              {rest.map((e, i) => (
                <div key={e.employeeId} className={`flex items-center gap-3 px-4 py-2.5 ${e.employeeId === meId ? "bg-primary/10" : ""}`}>
                  <span className="w-5 shrink-0 text-center text-sm font-bold text-fg-muted tabular-nums">{i + 4}</span>
                  <Avatar name={e.name} size="h-9 w-9 text-sm" me={e.employeeId === meId} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {e.name}
                    {e.employeeId === meId && <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">나</span>}
                  </span>
                  <span className="w-12 shrink-0 text-right text-sm font-bold text-primary-bright tabular-nums">{e.points}점</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
