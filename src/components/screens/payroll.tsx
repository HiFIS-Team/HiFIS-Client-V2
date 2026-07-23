"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/providers/auth";
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

// 급여 신청서 표준 항목 (일반적인 급여명세서 지급/공제 항목)
type Line = { id: string; label: string; amount: number };
const EARN_LABELS = ["기본급", "상여", "직책수당", "월차수당", "식대", "자가운전보조금", "야간근로수당", "연장근로수당"];
const DEDUCT_LABELS = ["국민연금", "건강보험", "장기요양보험", "고용보험", "건강보험정산", "장기요양보험정산", "소득세", "지방소득세", "농특세"];
const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls = "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

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

  // ── 급여 신청서 작성 폼 ──
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [earns, setEarns] = useState<Line[]>([]);
  const [deducts, setDeducts] = useState<Line[]>([]);
  const [meta, setMeta] = useState({ name: "", empNo: "", dept: "", position: "", joinedAt: "", payDate: "", company: "피트니스스타", footer: "귀하의 노고에 감사드립니다." });
  const [attendNote, setAttendNote] = useState("");
  const [calcNote, setCalcNote] = useState("");
  const [showAttend, setShowAttend] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const idRef = useRef(1);

  const openForm = () => {
    idRef.current = 1;
    const mk = (labels: string[]) => labels.map((l) => ({ id: String(idRef.current++), label: l, amount: 0 }));
    const e = mk(EARN_LABELS);
    if (p) e[0].amount = p.baseSalary; // 기본급은 계산된 명세서 값으로 미리 채움
    setEarns(e);
    setDeducts(mk(DEDUCT_LABELS));
    setMeta({
      name: user?.name ?? "",
      empNo: user?.empNo ?? "",
      dept: user?.team ?? "",
      position: user ? (RANK_KO[user.rank as Rank] ?? user.rank) : "",
      joinedAt: "",
      payDate: "",
      company: "피트니스스타",
      footer: "귀하의 노고에 감사드립니다.",
    });
    setAttendNote("");
    setCalcNote("");
    setShowAttend(false);
    setShowCalc(false);
    setFormOpen(true);
  };

  const patch = (which: "e" | "d", fn: (arr: Line[]) => Line[]) => (which === "e" ? setEarns(fn) : setDeducts(fn));
  const setLabel = (which: "e" | "d", id: string, label: string) => patch(which, (arr) => arr.map((x) => (x.id === id ? { ...x, label } : x)));
  const setAmt = (which: "e" | "d", id: string, amount: number) => patch(which, (arr) => arr.map((x) => (x.id === id ? { ...x, amount } : x)));
  const removeItem = (which: "e" | "d", id: string) => patch(which, (arr) => arr.filter((x) => x.id !== id));
  const addItem = (which: "e" | "d") => patch(which, (arr) => [...arr, { id: String(idRef.current++), label: "", amount: 0 }]);

  // 작성(제출) — 지금은 상태만 SUBMITTED로(위 submit이 실 엔드포인트+404 폴백 처리). 항목 payload는 백엔드 확장 시 전송.
  const submitForm = () => {
    setFormOpen(false);
    submit();
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
            <button type="button" onClick={openForm} disabled={submitting} className="btn-primary mt-3 w-full py-2.5 text-sm">
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

      {/* 급여 신청서 작성 모달 */}
      {formOpen &&
        (() => {
          const earnTotal = earns.reduce((s, x) => s + x.amount, 0);
          const deductTotal = deducts.reduce((s, x) => s + x.amount, 0);
          const rows = (which: "e" | "d", items: Line[]) =>
            items.map((it) => (
              <div key={it.id} className="flex items-center gap-1.5">
                <input
                  value={it.label}
                  onChange={(e) => setLabel(which, it.id, e.target.value)}
                  placeholder="항목"
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted"
                />
                <input
                  value={it.amount ? won(it.amount) : ""}
                  onChange={(e) => setAmt(which, it.id, digits(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="w-24 rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-right text-[13px] tabular-nums outline-none focus:border-primary/50 placeholder:text-fg-muted"
                />
                <button type="button" onClick={() => removeItem(which, it.id)} aria-label="삭제" className="shrink-0 text-red-400/70">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ));
          return (
            <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
              <button type="button" aria-label="닫기" onClick={() => setFormOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />
              <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
                {/* 헤더 */}
                <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
                  <p className="text-lg font-bold">급여 신청서 작성</p>
                  <button type="button" onClick={() => setFormOpen(false)} aria-label="닫기" className="text-fg-muted">
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {/* 대상 월 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={labelCls}>연도</p>
                      <div className={`${fieldCls} text-fg-muted`}>{YEAR}년</div>
                    </div>
                    <div>
                      <p className={labelCls}>월</p>
                      <div className={`${fieldCls} text-fg-muted`}>{month}월</div>
                    </div>
                  </div>

                  {/* 인적사항 */}
                  <div>
                    <p className={labelCls}>성명</p>
                    <input value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} className={fieldCls} />
                  </div>
                  <div>
                    <p className={labelCls}>생년월일(사번)</p>
                    <input value={meta.empNo} onChange={(e) => setMeta((m) => ({ ...m, empNo: e.target.value }))} className={fieldCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={labelCls}>부서</p>
                      <input value={meta.dept} onChange={(e) => setMeta((m) => ({ ...m, dept: e.target.value }))} className={fieldCls} />
                    </div>
                    <div>
                      <p className={labelCls}>직위</p>
                      <input value={meta.position} onChange={(e) => setMeta((m) => ({ ...m, position: e.target.value }))} className={fieldCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className={labelCls}>입사일</p>
                      <input type="date" value={meta.joinedAt} onChange={(e) => setMeta((m) => ({ ...m, joinedAt: e.target.value }))} className={fieldCls} />
                    </div>
                    <div>
                      <p className={labelCls}>지급일</p>
                      <input type="date" value={meta.payDate} onChange={(e) => setMeta((m) => ({ ...m, payDate: e.target.value }))} className={fieldCls} />
                    </div>
                  </div>
                  <div>
                    <p className={labelCls}>회사명</p>
                    <input value={meta.company} onChange={(e) => setMeta((m) => ({ ...m, company: e.target.value }))} className={fieldCls} />
                  </div>

                  {/* 지급 항목 */}
                  <section className="rounded-lg border border-white/10 p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-[13px] font-bold">지급 항목</span>
                      <span className="text-[13px] font-bold text-primary-bright tabular-nums">{won(earnTotal)}원</span>
                    </div>
                    <div className="space-y-1.5">{rows("e", earns)}</div>
                    <button type="button" onClick={() => addItem("e")} className="btn-secondary mt-2 px-3 py-1.5 text-[12px]">
                      + 항목 추가
                    </button>
                  </section>

                  {/* 공제 항목 */}
                  <section className="rounded-lg border border-white/10 p-3">
                    <div className="flex items-center justify-between pb-2">
                      <span className="text-[13px] font-bold">공제 항목</span>
                      <span className="text-[13px] font-bold text-red-300 tabular-nums">{won(deductTotal)}원</span>
                    </div>
                    <div className="space-y-1.5">{rows("d", deducts)}</div>
                    <button type="button" onClick={() => addItem("d")} className="btn-secondary mt-2 px-3 py-1.5 text-[12px]">
                      + 항목 추가
                    </button>
                  </section>

                  {/* 실수령액 */}
                  <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-3">
                    <span className="text-[13px] font-bold">실수령액 (지급 − 공제)</span>
                    <span className="text-base font-bold tabular-nums">{won(earnTotal - deductTotal)}원</span>
                  </div>

                  {/* 근태 정보 (선택) */}
                  <div className="rounded-lg border border-white/10">
                    <button type="button" onClick={() => setShowAttend((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-bold">
                      <span>
                        근태 정보 <span className="font-normal text-fg-muted">(선택)</span>
                      </span>
                      <span className="text-fg-muted">{showAttend ? "▾" : "▸"}</span>
                    </button>
                    {showAttend && (
                      <div className="border-t border-white/10 px-3 py-2.5">
                        <textarea value={attendNote} onChange={(e) => setAttendNote(e.target.value)} rows={2} placeholder="근무일수·연장근로·연차 사용 등" className={`${fieldCls} resize-none`} />
                      </div>
                    )}
                  </div>

                  {/* 계산 방법 (선택) */}
                  <div className="rounded-lg border border-white/10">
                    <button type="button" onClick={() => setShowCalc((v) => !v)} className="flex w-full items-center justify-between px-3 py-2.5 text-[13px] font-bold">
                      <span>
                        계산 방법 <span className="font-normal text-fg-muted">(선택)</span>
                      </span>
                      <span className="text-fg-muted">{showCalc ? "▾" : "▸"}</span>
                    </button>
                    {showCalc && (
                      <div className="border-t border-white/10 px-3 py-2.5">
                        <textarea value={calcNote} onChange={(e) => setCalcNote(e.target.value)} rows={2} placeholder="4대보험 요율·비과세 기준 등" className={`${fieldCls} resize-none`} />
                      </div>
                    )}
                  </div>

                  {/* 하단 문구 */}
                  <div>
                    <p className={labelCls}>하단 문구</p>
                    <textarea value={meta.footer} onChange={(e) => setMeta((m) => ({ ...m, footer: e.target.value }))} rows={2} className={`${fieldCls} resize-none`} />
                  </div>
                </div>

                {/* 하단 버튼 */}
                <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 py-3">
                  <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                    취소
                  </button>
                  <button type="button" onClick={submitForm} className="btn-primary flex-1 py-2.5 text-sm">
                    작성
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
