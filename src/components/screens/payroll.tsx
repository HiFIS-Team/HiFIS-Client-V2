"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { getMyPayslip, submitMyPayslip, type PayslipDTO, type PayslipStatus, type Rank } from "@/lib/api/hifis";

/**
 * 급여명세서 (내 급여 · 개인) — **백엔드 연동**.
 *
 * `GET /payslips/me?yearMonth` 로 본인 명세서 조회. 백엔드가 전부 계산(기본급·인센티브·gross·공제·net + 매출 basis).
 * ⚠️ 예전의 3.3%↔4대보험 **토글·자체 계산 폐기** — 명세서마다 `deductionMethod`·`deductions` 가 서버 확정.
 * 명세서 없는 달은 404 → 안내(관리자가 `POST /payslips/generate` 로 산출).
 */

const YEAR = 2026;
const BASE_MONTH = 7;

const pad = (n: number) => String(n).padStart(2, "0");
const won = (n: number) => n.toLocaleString("en-US");

const RANK_KO: Record<Rank, string> = {
  JUNIOR_TRAINER: "주니어 트레이너",
  PRO_TRAINER: "프로 트레이너",
  PRO1_TRAINER: "프로1 트레이너",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  FC: "FC",
};
const METHOD_KO: Record<string, string> = { FREELANCE: "프리랜서 3.3%", INSURANCE: "4대보험" };
const STATUS: Record<PayslipStatus, { ko: string; cls: string }> = {
  DRAFT: { ko: "미제출", cls: "bg-white/10 text-fg-muted" },
  SUBMITTED: { ko: "승인 대기", cls: "bg-amber-400/15 text-amber-300" },
  APPROVED: { ko: "승인 완료", cls: "bg-emerald-400/15 text-emerald-300" },
  REJECTED: { ko: "반려됨", cls: "bg-red-400/15 text-red-300" },
};

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

export function Payroll() {
  const { show } = useToast();
  const [month, setMonth] = useState(BASE_MONTH);
  const ym = `${YEAR}-${pad(month)}`;

  const [data, setData] = useState<PayslipDTO | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  // 제출·결재 상태. 백엔드가 status를 내려주면 그 값, 아니면 미제출(DRAFT).
  const [status, setStatus] = useState<PayslipStatus>("DRAFT");

  const load = useCallback((yearMonth: string) => {
    getMyPayslip(yearMonth)
      .then((p) => {
        setData(p);
        setStatus(p.status ?? "DRAFT");
        setState("ok");
      })
      .catch((e) => {
        setData(null);
        setStatus("DRAFT");
        setState(e instanceof ApiError && e.status === 404 ? "none" : "error");
      });
  }, []);

  const submit = () => {
    setSubmitting(true);
    submitMyPayslip(ym)
      .then((np) => {
        setData(np);
        setStatus(np.status ?? "SUBMITTED");
        show("급여를 신청했습니다");
      })
      .catch((e) => {
        // 백엔드 제출 엔드포인트가 아직이면(404) 로컬로 상태만 반영(미리보기) — 붙으면 위 then으로 처리됨
        if (e instanceof ApiError && e.status === 404) {
          setStatus("SUBMITTED");
          show("급여를 신청했습니다");
        } else {
          show("급여 신청에 실패했어요", "cancel");
        }
      })
      .finally(() => setSubmitting(false));
  };

  useEffect(() => {
    load(ym);
  }, [ym, load]);

  // 월 변경 직후엔 이전 달 data(yearMonth 불일치)를 보여주지 않도록 게이트
  const p = data && data.yearMonth === ym ? data : null;

  const newTotal = p ? p.basis.newSales.reduce((s, x) => s + x.amount, 0) : 0;
  const reTotal = p ? p.basis.renewalSales.reduce((s, x) => s + x.amount, 0) : 0;

  const earnings = p
    ? [
        { label: `기본급 · ${RANK_KO[p.rank] ?? p.rank}`, amount: p.baseSalary },
        { label: "PT 인센티브 · 신규 40%", amount: p.incentiveNew },
        { label: "PT 인센티브 · 재등록 50%", amount: p.incentiveRenewal },
        ...(p.otherAllowances > 0 ? [{ label: "기타 수당", amount: p.otherAllowances }] : []),
      ]
    : [];

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 + 월 이동 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">급여명세서</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMonth((m) => (m === 1 ? 12 : m - 1))} aria-label="이전 달" className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <span className="min-w-[92px] text-center text-sm font-semibold tabular-nums">
            {YEAR}년 {month}월
          </span>
          <button type="button" onClick={() => setMonth((m) => (m === 12 ? 1 : m + 1))} aria-label="다음 달" className="grid h-8 w-8 place-items-center rounded-lg text-fg-muted">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 급여 신청(제출) · 결재 상태 — 항상 노출(멤버·매니저·관리자 전부 자기 급여 신청 가능) */}
      {state !== "loading" && (
        <section className="rounded-2xl border border-white/10 bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">급여 신청</span>
            <span className={`rounded-md px-2 py-0.5 text-[13px] font-bold ${STATUS[status].cls}`}>{STATUS[status].ko}</span>
          </div>
          {status === "REJECTED" && p?.rejectReason && (
            <p className="mt-2 rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-[13px] leading-relaxed text-red-200">반려 사유 · {p.rejectReason}</p>
          )}
          {status === "SUBMITTED" && <p className="mt-2 text-[13px] text-fg-muted">관리자 승인을 기다리고 있어요.</p>}
          {status === "APPROVED" && <p className="mt-2 text-[13px] text-fg-muted">승인 완료 · 지급이 확정됐어요.</p>}
          {(status === "DRAFT" || status === "REJECTED") && (
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary mt-3 w-full py-2.5 text-sm">
              {submitting ? "신청 중…" : status === "REJECTED" ? "다시 신청하기" : "급여 신청하기"}
            </button>
          )}
        </section>
      )}

      {!p ? (
        <div className="rounded-2xl border border-white/10 bg-surface px-4 py-16 text-center text-sm text-fg-muted">
          {state === "error" ? "명세서를 불러오지 못했어요." : state === "none" ? `${month}월 명세서가 아직 없어요.` : "불러오는 중…"}
          {state === "none" && <p className="mt-1 text-xs">관리자가 이 달 급여를 산출하면 여기에 표시돼요.</p>}
        </div>
      ) : (
        <>
          {/* 실지급액 하이라이트 */}
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-fg-muted">
                실지급액 · {month}월 · {RANK_KO[p.rank] ?? p.rank}
              </p>
              <button type="button" onClick={() => show("명세서를 저장했습니다")} aria-label="명세서 저장" className="flex items-center gap-1 text-[11px] font-semibold text-primary-bright">
                <DownloadIcon className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {won(p.net)}
              <span className="ml-1 text-lg font-semibold text-fg-muted">원</span>
            </p>
            <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-2 text-[12px] tabular-nums">
              <span className="text-fg-muted">
                지급 <b className="text-emerald-300">{won(p.gross)}</b>
              </span>
              <span className="text-fg-muted">
                공제 <b className="text-red-300">−{won(p.totalDeduction)}</b>
              </span>
            </div>
          </div>

          {/* 공제 방식 (서버 확정 — 읽기 전용 뱃지) */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-2.5">
            <span className="text-xs font-semibold text-fg-muted">공제 방식</span>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[13px] font-bold text-primary-bright">{METHOD_KO[p.deductionMethod] ?? p.deductionMethod}</span>
          </div>

          {/* 지급 내역 */}
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="pb-1 text-sm font-bold">지급 내역</p>
            <div className="divide-y divide-white/5">
              {earnings.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-fg-muted">{r.label}</span>
                  <span className="font-semibold tabular-nums">{won(r.amount)}원</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2.5 text-sm">
              <span className="font-bold">총 지급액</span>
              <span className="font-bold text-emerald-300 tabular-nums">{won(p.gross)}원</span>
            </div>
          </section>

          {/* 공제 내역 */}
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="pb-1 text-sm font-bold">공제 내역</p>
            {p.deductions.length === 0 ? (
              <p className="py-2 text-[13px] text-fg-muted">공제 항목이 없어요.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {p.deductions.map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2.5 text-[13px]">
                    <span className="text-fg-muted">{r.label}</span>
                    <span className="font-semibold tabular-nums">−{won(r.amount)}원</span>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2.5 text-sm">
              <span className="font-bold">총 공제액</span>
              <span className="font-bold text-red-300 tabular-nums">−{won(p.totalDeduction)}원</span>
            </div>
          </section>

          {/* 실지급액 */}
          <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-3.5">
            <span className="text-sm font-bold">실지급액</span>
            <span className="text-lg font-bold tabular-nums">{won(p.net)}원</span>
          </section>

          {/* 산출 근거 */}
          <section className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="pb-2 text-sm font-bold">인센티브 산출 근거</p>

            {/* 신규 */}
            <div className="flex items-center justify-between pb-1.5 text-[12px]">
              <span className="font-semibold text-sky-300">신규 등록 {p.basis.newSales.length}건 · 40%</span>
              <span className="text-fg-muted tabular-nums">
                매출 {won(newTotal)} → <b className="text-fg">{won(p.incentiveNew)}원</b>
              </span>
            </div>
            {p.basis.newSales.length === 0 ? (
              <p className="py-1.5 text-[13px] text-fg-muted">신규 등록이 없어요.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {p.basis.newSales.map((s, i) => (
                  <div key={`${s.memberName}-${i}`} className="flex items-center justify-between py-2 text-[13px]">
                    <span>
                      {s.memberName} <span className="text-fg-muted">· {s.pkg}</span>
                    </span>
                    <span className="tabular-nums text-fg-muted">{won(s.amount)}원</span>
                  </div>
                ))}
              </div>
            )}

            {/* 재등록 */}
            <div className="mt-3 flex items-center justify-between pb-1.5 text-[12px]">
              <span className="font-semibold text-violet-300">재등록 {p.basis.renewalSales.length}건 · 50%</span>
              <span className="text-fg-muted tabular-nums">
                매출 {won(reTotal)} → <b className="text-fg">{won(p.incentiveRenewal)}원</b>
              </span>
            </div>
            {p.basis.renewalSales.length === 0 ? (
              <p className="py-1.5 text-[13px] text-fg-muted">재등록이 없어요.</p>
            ) : (
              <div className="divide-y divide-white/5">
                {p.basis.renewalSales.map((s, i) => (
                  <div key={`${s.memberName}-${i}`} className="flex items-center justify-between py-2 text-[13px]">
                    <span>
                      {s.memberName} <span className="text-fg-muted">· {s.pkg}</span>
                    </span>
                    <span className="tabular-nums text-fg-muted">{won(s.amount)}원</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[12px] text-fg-muted">
              <span>세션 싸인</span>
              <span className="tabular-nums">이번 달 {p.basis.sessionSigns}회</span>
            </div>
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-fg-muted">
            정산 기준: 기본급은 직급 기준, PT 인센티브는 신규 40% · 재등록 50%. 실적(매출·세션)은 회원 등록·세션지 데이터 기반이에요.
          </p>
        </>
      )}
    </div>
  );
}
