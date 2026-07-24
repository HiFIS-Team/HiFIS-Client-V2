"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { approvePayslip, listDecidedPayslips, listPendingPayslips, rejectPayslip, type PayslipDTO, type Rank } from "@/lib/api/hifis";

/**
 * 급여명세서 (어드민/대표) — 본인 급여가 없으니(CEO 무급) 개인 명세서 대신 **급여 결재** 전용.
 * `listPendingPayslips()`(box=inbox) 로 직원 신청 명세서를 받아 산출 내역 확인 후 승인/반려.
 * 매니저(점장/팀장)는 본인 명세서+결재 겸용(payroll.tsx) 유지 — 이 화면은 ADMIN 라우트 분기 전용.
 * setState 는 전부 .then/핸들러 → set-state-in-effect 아님.
 */

const won = (n: number) => n.toLocaleString("en-US");
const RANK_KO: Record<Rank, string> = {
  TRAINER: "트레이너",
  FC: "FC",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  DEVELOPER: "개발자",
  CEO: "대표",
};

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}

export function AdminPayrollPage() {
  const { show } = useToast();
  const { status: authStatus } = useAuth();
  const nameOf = useEmployeeNames();

  const [inbox, setInbox] = useState<PayslipDTO[]>([]);
  const [decided, setDecided] = useState<PayslipDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    Promise.all([listPendingPayslips(), listDecidedPayslips()])
      .then(([pend, dec]) => {
        setInbox(pend);
        setDecided(dec);
        setLoaded(true);
      })
      .catch(() => {
        setInbox([]);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (authStatus === "authed") load();
  }, [authStatus, load]);

  const doApprove = (id: string) => {
    approvePayslip(id)
      .then(() => {
        show("급여를 승인했습니다");
        load();
      })
      .catch(() => show("승인에 실패했어요", "cancel"));
  };
  const doReject = () => {
    const id = rejectId;
    const reason = rejectReason.trim();
    if (!id || !reason) return;
    rejectPayslip(id, reason)
      .then(() => {
        show("급여를 반려했습니다", "cancel");
        setRejectId(null);
        setRejectReason("");
        load();
      })
      .catch(() => show("반려에 실패했어요", "cancel"));
  };

  const netSum = inbox.reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      <div>
        <h1 className="text-xl font-bold">급여 결재</h1>
        <p className="mt-0.5 text-xs text-fg-muted">직원 급여 신청 승인·반려</p>
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-3.5">
          <p className="text-xs text-fg-muted">결재 대기</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-amber-300">{inbox.length}건</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
          <p className="text-xs text-fg-muted">신청 실지급 합계</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">{won(netSum)}원</p>
        </div>
      </div>

      {/* 결재 대기 목록 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="text-base font-bold">결재 대기</p>
        <p className="mt-0.5 text-xs text-fg-muted">신청한 명세서를 확인하고 승인하거나 반려하세요.</p>
        <div className="mt-3 space-y-2">
          {!loaded ? (
            <p className="py-2 text-sm text-fg-muted">불러오는 중…</p>
          ) : inbox.length === 0 ? (
            <p className="py-2 text-sm text-fg-muted">대기 중인 급여 결재가 없어요.</p>
          ) : (
            inbox.map((p) => {
              const name = nameOf(p.employeeId);
              return (
                <div key={p.id} className="rounded-xl border border-white/10 bg-surface-2/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarColor(name) }}>
                        {name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{name}</span>
                        <span className="block text-[11px] text-fg-muted">
                          {RANK_KO[p.rank] ?? p.rank} · {p.yearMonth}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[11px] text-fg-muted">실지급</span>
                      <span className="block text-sm font-bold tabular-nums">{won(p.net)}원</span>
                    </span>
                  </div>

                  {/* 산출 내역 요약 */}
                  <div className="mt-2.5 space-y-1 border-t border-white/5 pt-2.5 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">기본급</span>
                      <span className="tabular-nums">{won(p.baseSalary)}원</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">PT 인센티브 (신규·재등록)</span>
                      <span className="tabular-nums">{won(p.incentiveNew + p.incentiveRenewal)}원</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">공제</span>
                      <span className="tabular-nums text-red-300">−{won(p.totalDeduction)}원</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-1">
                      <span className="text-fg-muted">세션 싸인</span>
                      <span className="tabular-nums text-fg-muted">이번 달 {p.basis.sessionSigns}회</span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex gap-2">
                    <button type="button" onClick={() => setRejectId(p.id)} className="btn-secondary flex-1 py-1.5 text-[13px]">
                      반려
                    </button>
                    <button type="button" onClick={() => doApprove(p.id)} className="btn-primary flex-1 py-1.5 text-[13px]">
                      승인
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 처리 내역 (승인/반려) */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-base font-bold">처리 내역</p>
          <span className="text-xs text-fg-muted">{decided.length}건</span>
        </div>
        <div className="mt-3 space-y-2">
          {!loaded ? (
            <p className="py-2 text-sm text-fg-muted">불러오는 중…</p>
          ) : decided.length === 0 ? (
            <p className="py-2 text-sm text-fg-muted">처리한 급여 결재가 없어요.</p>
          ) : (
            decided.map((p) => {
              const name = nameOf(p.employeeId);
              const approved = p.status === "APPROVED";
              return (
                <div key={p.id} className="rounded-xl border border-white/10 bg-surface-2/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarColor(name) }}>
                        {name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">{name}</span>
                        <span className="block text-[11px] text-fg-muted">
                          {RANK_KO[p.rank] ?? p.rank} · {p.yearMonth} · 실지급 {won(p.net)}원
                        </span>
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${approved ? "bg-emerald-400/12 text-emerald-300" : "bg-red-500/12 text-red-400"}`}>
                      {approved ? "승인" : "반려"}
                    </span>
                  </div>
                  {!approved && p.rejectReason && (
                    <p className="mt-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[12px] leading-snug text-red-200/90">사유: {p.rejectReason}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-fg-muted">
        급여 명세서는 직원 본인이 지급일에 신청하고, 대표 승인 시 지급이 확정돼요. 반려하면 사유와 함께 신청자에게 알림이 가요.
      </p>

      {/* 반려 사유 입력 모달 */}
      {rejectId && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setRejectId(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-base font-bold">반려 사유</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="반려 사유를 입력하세요"
              className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                취소
              </button>
              <button type="button" onClick={doReject} disabled={!rejectReason.trim()} className="btn-danger flex-1 py-2.5 text-sm">
                반려
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
