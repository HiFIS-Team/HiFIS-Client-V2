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
 * 데이터는 전부 기존 API 재활용: getDashboard(매출·점수·오늘 출근수) + 대기 3종 카운트.
 * (set-state 는 .then 안에서만 → set-state-in-effect 아님)
 */

type Pending = { payslips: number; leaves: number; approvals: number };

const won = (n: number) => n.toLocaleString("ko-KR");

const Chevron = () => (
  <svg className="h-4 w-4 text-fg-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
    { label: "급여 결재", emoji: "💰", count: pending?.payslips ?? 0, href: "/payroll" },
    { label: "휴가 승인", emoji: "🌴", count: pending?.leaves ?? 0, href: "/attendance" },
    { label: "전자결재", emoji: "📝", count: pending?.approvals ?? 0, href: "/approvals" },
  ];

  const headcount = dash?.headcount ?? 0;
  const checkedIn = dash?.checkedInToday ?? 0;
  const pct = headcount > 0 ? Math.round((checkedIn / headcount) * 100) : 0;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 인사 */}
      <GreetingCard name={user?.name} />

      {/* 결재·승인 대기 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">결재·승인 대기</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              total > 0 ? "bg-primary/15 text-primary-bright" : "bg-white/5 text-fg-muted"
            }`}
          >
            {total}건
          </span>
        </div>
        {pending && total === 0 ? (
          <p className="mt-3 text-[13px] text-fg-muted">처리할 결재가 없어요.</p>
        ) : (
          <div className="mt-1.5 divide-y divide-white/5">
            {rows.map((r) => (
              <Link key={r.href} href={r.href} className="flex items-center gap-3 py-2.5 active:opacity-60">
                <span className="text-base">{r.emoji}</span>
                <span className="flex-1 text-[13px]">{r.label}</span>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    r.count > 0 ? "text-primary-bright" : "text-fg-muted"
                  }`}
                >
                  {r.count}
                </span>
                <Chevron />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 팀 출근 현황 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">오늘 출근 현황</h2>
          <span className="text-[11px] text-fg-muted tabular-nums">{dash ? `${checkedIn}/${headcount}명` : "—"}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-[13px] text-fg-muted">
          {dash ? (
            <>
              <span className="font-bold text-fg">{checkedIn}명</span> 출근 · 미출근 {Math.max(0, headcount - checkedIn)}명
            </>
          ) : (
            "불러오는 중…"
          )}
        </p>
      </section>

      {/* 이번 달 매출·점수 요약 → 대시보드 */}
      <Link href="/dashboard" className="block rounded-2xl border border-white/10 bg-surface p-4 active:opacity-60">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">이번 달 요약</h2>
          <span className="text-[11px] text-primary-bright">자세히 →</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] text-fg-muted">매출</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{dash ? `${won(dash.sales.total)}원` : "—"}</p>
            {dash && (
              <p className="mt-0.5 text-[11px] text-fg-muted">
                신규 {won(dash.sales.new)} · 재등록 {won(dash.sales.renewal)}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-fg-muted">누적 점수</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{dash ? `${won(dash.scores.total)}점` : "—"}</p>
            {dash && <p className="mt-0.5 text-[11px] text-fg-muted">매출 {dash.sales.count}건</p>}
          </div>
        </div>
      </Link>
    </div>
  );
}
