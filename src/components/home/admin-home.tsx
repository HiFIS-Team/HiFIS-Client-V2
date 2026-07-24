"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth";
import { GreetingCard } from "@/components/home/greeting-card";
import {
  getDashboard,
  listApprovals,
  listLeaves,
  listPendingPayslips,
  type DashboardDTO,
} from "@/lib/api/hifis";

/**
 * 어드민(대표) 홈 — 트레이너 홈의 바코드·근태·환경정비 자리를 감독자 시점으로 교체.
 * 인사말 → 결재/승인 대기 → 팀 출근 현황 → 이번 달 매출·점수 요약.
 * 트레이너 홈 카드 톤을 그대로 계승: 좌측 컬러 바 행 · 그라데이션 진행 바 · surface-2 타일.
 * 데이터는 전부 기존 API 재활용(getDashboard + 대기 3종). setState 는 .then 안 → set-state-in-effect 아님.
 */

type Pending = { payslips: number; leaves: number; approvals: number };

const won = (n: number) => n.toLocaleString("ko-KR");

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function AdminHome() {
  const { user } = useAuth();
  const [dash, setDash] = useState<DashboardDTO | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      getDashboard().catch(() => null),
      listPendingPayslips().catch(() => []),
      listLeaves({ status: "PENDING" }).catch(() => []),
      listApprovals("inbox").catch(() => []),
    ]).then(([d, ps, lv, ap]) => {
      if (!alive) return;
      setDash(d);
      setPending({ payslips: ps.length, leaves: lv.length, approvals: ap.length });
    });
    return () => {
      alive = false;
    };
  }, []);

  const total = pending ? pending.payslips + pending.leaves + pending.approvals : 0;
  const rows = [
    { label: "급여 결재", emoji: "💰", count: pending?.payslips ?? 0, href: "/payroll", bar: "bg-teal-400", num: "text-teal-300" },
    { label: "휴가 승인", emoji: "🌴", count: pending?.leaves ?? 0, href: "/attendance", bar: "bg-rose-400", num: "text-rose-300" },
    { label: "전자결재", emoji: "📝", count: pending?.approvals ?? 0, href: "/approvals", bar: "bg-amber-400", num: "text-amber-300" },
  ];

  const headcount = dash?.headcount ?? 0;
  const checkedIn = dash?.checkedInToday ?? 0;
  const absent = Math.max(0, headcount - checkedIn);
  const pct = headcount > 0 ? Math.round((checkedIn / headcount) * 100) : 0;

  const sales = dash?.sales;
  const splitDenom = sales ? sales.new + sales.renewal : 0;
  const newPct = splitDenom > 0 ? (sales!.new / splitDenom) * 100 : 0;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 인사 */}
      <GreetingCard name={user?.name} />

      {/* 결재·승인 대기 — 오늘의 업무 카드 톤(좌측 컬러 바 행) */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <p className="text-sm font-bold">
            결재·승인 대기 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{total}</span>
          </p>
          {total > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary-bright">
              {total}건 대기
            </span>
          )}
        </div>
        <div className="divide-y divide-white/5">
          {rows.map((r) => (
            <Link key={r.href} href={r.href} className="flex w-full items-center gap-3 px-4 py-3 active:opacity-60">
              <span className={`h-8 w-1 shrink-0 rounded-full ${r.count > 0 ? r.bar : "bg-white/5"}`} />
              <span className="text-[15px] leading-none">{r.emoji}</span>
              <span className="min-w-0 flex-1 text-sm font-bold">{r.label}</span>
              <span className={`text-sm font-bold tabular-nums ${r.count > 0 ? r.num : "text-fg-muted"}`}>{r.count}</span>
              <Chevron className="h-4 w-4 text-fg-muted" />
            </Link>
          ))}
        </div>
      </section>

      {/* 오늘 출근 현황 — 근태 카드 톤(큰 숫자 + 그라데이션 바) */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">오늘 출근 현황</p>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-fg-muted tabular-nums">
            {dash ? `${checkedIn}/${headcount}명` : "—"}
          </span>
        </div>
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
          {dash ? checkedIn : "—"}
          <span className="text-lg font-semibold text-fg-muted"> / {dash ? headcount : "—"}명 출근</span>
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#c471ff,#7d1ff0)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
          <span className="text-fg-muted">
            출근 <span className="ml-1 font-semibold text-emerald-300 tabular-nums">{dash ? `${checkedIn}명` : "—"}</span>
          </span>
          <span className="text-fg-muted">
            미출근 <span className="ml-1 font-semibold text-fg tabular-nums">{dash ? `${absent}명` : "—"}</span>
          </span>
        </div>
      </section>

      {/* 이번 달 요약 — surface-2 타일 2개 → 대시보드 */}
      <Link href="/dashboard" className="block rounded-2xl border border-white/10 bg-surface p-4 active:opacity-60">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">이번 달 요약</p>
          <span className="flex items-center gap-1 text-xs font-semibold text-fg-muted">
            자세히 <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-[11px] text-fg-muted">이번 달 매출</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {dash ? won(sales!.total) : "—"}
              <span className="text-sm font-semibold text-fg-muted">원</span>
            </p>
            {dash && splitDenom > 0 && (
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="bg-primary" style={{ width: `${newPct}%` }} />
                <div className="bg-sky-400" style={{ width: `${100 - newPct}%` }} />
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-fg-muted">
              {dash ? `신규 ${won(sales!.new)} · 재등록 ${won(sales!.renewal)}` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-[11px] text-fg-muted">누적 점수</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary-bright">
              {dash ? won(dash.scores.total) : "—"}
              <span className="text-sm font-semibold text-fg-muted">점</span>
            </p>
            <p className="mt-1.5 text-[11px] text-fg-muted">{dash ? `매출 ${sales!.count}건` : "—"}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
