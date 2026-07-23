"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useAuth } from "@/providers/auth";
import { getDashboard, type DashboardDTO } from "@/lib/api/hifis";

/* ── 아이콘 ─────────────────────────────────────── */
type IconP = { className?: string };
function Svg({ className, children }: IconP & { children: ReactElement }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function UsersIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 19a5 5 0 0 1 10 0" />
        <path d="M16 6.5a2.8 2.8 0 0 1 0 5.5" />
        <path d="M17 14.2a5 5 0 0 1 3 4.8" />
      </>
    </Svg>
  );
}
function CheckInIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <>
        <path d="M9 11.5 11 13.5 15.5 9" />
        <rect x="4" y="4.5" width="16" height="16" rx="2.5" />
      </>
    </Svg>
  );
}
function LeaveIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <>
        <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
        <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
      </>
    </Svg>
  );
}
function StarIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9z" />
    </Svg>
  );
}
function RefreshIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 4v5h-5" />
      </>
    </Svg>
  );
}
function WonIcon({ className }: IconP) {
  return (
    <Svg className={className}>
      <>
        <path d="M4 7l3 10 3-8 2 8 3-10" />
        <path d="M3 10.5h18" />
      </>
    </Svg>
  );
}

/* ── 유틸 ───────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const won = (n: number) => `${n.toLocaleString("en-US")}원`;
const compact = (n: number) => n.toLocaleString("en-US");

// 점수 카테고리 (업무 5탭 + 운영자) — 라벨·색·이모지
const SCORE_CATS: { key: string; label: string; emoji: string; color: string }[] = [
  { key: "ENV", label: "환경정비", emoji: "🧹", color: "#22c55e" },
  { key: "CLASS", label: "수업 개수", emoji: "🏋️", color: "#0ea5e9" },
  { key: "PEER", label: "동료평가", emoji: "🤝", color: "#9d3bfc" },
  { key: "KINDNESS", label: "회원 친절도", emoji: "💗", color: "#ec4899" },
  { key: "CONTRIB", label: "센터 기여도", emoji: "💡", color: "#f59e0b" },
  { key: "OPERATOR", label: "운영자 평가", emoji: "⭐", color: "#14b8a6" },
];

function StatCard({ label, value, Icon, tint }: { label: string; value: string; Icon: (p: IconP) => ReactElement; tint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2.5 text-xs text-fg-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [sel, setSel] = useState<"this" | "last">("this");
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!canManage) return;
    let period: string | undefined;
    if (sel === "last") {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      period = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    }
    getDashboard(period ? { period } : {})
      .then((r) => {
        setData(r);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [canManage, sel]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canManage) {
    return (
      <div className="px-4 pb-8 pt-5">
        <h1 className="text-xl font-bold">대시보드</h1>
        <div className="mt-4 rounded-2xl border border-white/10 bg-surface px-4 py-16 text-center text-sm text-fg-muted">
          대시보드는 <b className="text-fg">관리자·매니저</b>만 볼 수 있어요.
        </div>
      </div>
    );
  }

  const periodLabel = data ? `${data.period.split("-")[0]}년 ${Number(data.period.split("-")[1])}월` : sel === "this" ? "이번 달" : "지난 달";
  const by = data?.scores.byCategory ?? {};
  const maxCat = Math.max(1, ...SCORE_CATS.map((c) => by[c.key] ?? 0));
  const salesBase = data ? Math.max(1, data.sales.new + data.sales.renewal) : 1;
  const newPct = data ? (data.sales.new / salesBase) * 100 : 0;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 + 기간 */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">관리</p>
          <h1 className="text-xl font-bold">대시보드</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} aria-label="새로고침" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted">
            <RefreshIcon className="h-4 w-4" />
          </button>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(
              [
                ["this", "이번 달"],
                ["last", "지난 달"],
              ] as const
            ).map(([k, lb]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSel(k)}
                className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${sel === k ? "bg-primary/15 text-primary-bright" : "text-fg-muted"}`}
              >
                {lb}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[13px] text-fg-muted">
        <b className="text-fg">{periodLabel}</b> 기준 · 지점 통합
      </p>

      {!loaded && !data ? (
        <div className="rounded-2xl border border-white/10 bg-surface px-4 py-16 text-center text-sm text-fg-muted">불러오는 중…</div>
      ) : !data ? (
        <div className="rounded-2xl border border-white/10 bg-surface px-4 py-16 text-center text-sm text-fg-muted">데이터를 불러오지 못했어요.</div>
      ) : (
        <>
          {/* 요약 4타일 */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="구성원" value={`${data.headcount}명`} Icon={UsersIcon} tint="bg-blue-500/15 text-blue-400" />
            <StatCard label="오늘 출근" value={`${data.checkedInToday}명`} Icon={CheckInIcon} tint="bg-emerald-500/15 text-emerald-400" />
            <StatCard label="승인 대기 휴가" value={`${data.leavesPending}건`} Icon={LeaveIcon} tint="bg-amber-500/15 text-amber-400" />
            <StatCard label="총 점수" value={compact(data.scores.total)} Icon={StarIcon} tint="bg-violet-500/15 text-violet-400" />
          </div>

          {/* 매출 요약 */}
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/15 text-rose-300">
                <WonIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-fg-muted">총 매출 · {data.sales.count}건</p>
                <p className="text-2xl font-extrabold tabular-nums">{won(data.sales.total)}</p>
              </div>
            </div>

            {/* 신규/재등록 split bar */}
            <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-white/8">
              <div className="flex h-full">
                <div className="h-full bg-primary" style={{ width: `${newPct}%` }} />
                <div className="h-full bg-sky-400" style={{ width: `${100 - newPct}%` }} />
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                  <span className="h-2 w-2 rounded-full bg-primary" />신규
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">{won(data.sales.new)}</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />재등록
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums">{won(data.sales.renewal)}</p>
              </div>
            </div>
          </section>

          {/* 점수 분포 */}
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-bold">점수 분포</h2>
              <span className="text-xs text-fg-muted tabular-nums">총 {compact(data.scores.total)}점</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {SCORE_CATS.map((c) => {
                const v = by[c.key] ?? 0;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className="text-[15px] leading-none">{c.emoji}</span>
                        {c.label}
                      </span>
                      <span className="font-bold tabular-nums">{compact(v)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(v / maxCat) * 100}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
