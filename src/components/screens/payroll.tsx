"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * 급여명세서 (내 급여 · 개인)
 *
 * 스펙 ⑥급여 기준의 트레이너 명세서. 프론트 우선이라 자체 목 실적으로 계산한다.
 * - 기본급: 직급표 기준(프로 트레이너 80만)
 * - PT 인센티브: 신규 등록 매출 ×40% + 재등록 매출 ×50%
 * - 공제: **프리랜서 3.3% ↔ 4대보험**을 화면에서 토글(사용자 요청) → 실지급액 재계산
 * - 산출 근거: 신규/재등록 매출 내역 + 세션 싸인 수
 * ⚠️ 실적(매출·세션)은 회원 도메인 붙으면 연동. 현재 목.
 */

// 은후: 프로 트레이너 (직급표 — 기본급 80만, 신규 40% / 재등록 50%)
const RANK = { label: "프로 트레이너", base: 800_000, newRate: 0.4, reRate: 0.5 };

// 이번 달 인센티브 실적 (목) — 회원 등록 결제액 기준
const NEW_SALES = [
  { name: "김민수", pkg: "PT 30회", amount: 1_800_000 },
  { name: "이하나", pkg: "PT 20회", amount: 1_300_000 },
  { name: "박지호", pkg: "PT 10회", amount: 700_000 },
];
const RE_SALES = [
  { name: "최유진", pkg: "PT 40회", amount: 2_400_000 },
  { name: "정승우", pkg: "PT 20회", amount: 1_300_000 },
];
const SESSION_SIGNS = 42; // 세션 싸인 수(참고 — 수업 개수 점수와 동일 소스)

const YEAR = 2026;
const BASE_MONTH = 7;

const won = (n: number) => n.toLocaleString("en-US");

type Method = "freelance" | "insurance";

type Row = { label: string; amount: number };

// 공제 계산 — 방식별
function deductionsOf(gross: number, method: Method): { rows: Row[]; total: number } {
  if (method === "freelance") {
    const incomeTax = Math.round(gross * 0.03);
    const localTax = Math.round(gross * 0.003);
    const rows = [
      { label: "소득세 (3%)", amount: incomeTax },
      { label: "지방소득세 (0.3%)", amount: localTax },
    ];
    return { rows, total: incomeTax + localTax };
  }
  // 4대보험 (근로자 부담분) + 근로소득세
  const pension = Math.round(gross * 0.045); // 국민연금 4.5%
  const health = Math.round(gross * 0.03545); // 건강보험 3.545%
  const care = Math.round(health * 0.1295); // 장기요양 = 건보료 12.95%
  const employ = Math.round(gross * 0.009); // 고용보험 0.9%
  const incomeTax = Math.round(gross * 0.04); // 근로소득세(간이세액 근사)
  const localTax = Math.round(incomeTax * 0.1); // 지방소득세 = 소득세 10%
  const rows = [
    { label: "국민연금 (4.5%)", amount: pension },
    { label: "건강보험 (3.545%)", amount: health },
    { label: "장기요양 (건보 12.95%)", amount: care },
    { label: "고용보험 (0.9%)", amount: employ },
    { label: "근로소득세", amount: incomeTax },
    { label: "지방소득세", amount: localTax },
  ];
  return { rows, total: pension + health + care + employ + incomeTax + localTax };
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
  const [method, setMethod] = useState<Method>("freelance");

  const newTotal = NEW_SALES.reduce((s, x) => s + x.amount, 0);
  const reTotal = RE_SALES.reduce((s, x) => s + x.amount, 0);
  const newInc = Math.round(newTotal * RANK.newRate);
  const reInc = Math.round(reTotal * RANK.reRate);

  const earnings: Row[] = [
    { label: `기본급 · ${RANK.label}`, amount: RANK.base },
    { label: "PT 인센티브 · 신규 40%", amount: newInc },
    { label: "PT 인센티브 · 재등록 50%", amount: reInc },
  ];
  const gross = RANK.base + newInc + reInc;

  const ded = deductionsOf(gross, method);
  const net = gross - ded.total;

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

      {/* 실지급액 하이라이트 */}
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-fg-muted">
            실지급액 · {month}월 · {RANK.label}
          </p>
          <button type="button" onClick={() => show("명세서를 저장했습니다")} aria-label="명세서 저장" className="flex items-center gap-1 text-[11px] font-semibold text-primary-bright">
            <DownloadIcon className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {won(net)}
          <span className="ml-1 text-lg font-semibold text-fg-muted">원</span>
        </p>
        <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-2 text-[12px] tabular-nums">
          <span className="text-fg-muted">
            지급 <b className="text-emerald-300">{won(gross)}</b>
          </span>
          <span className="text-fg-muted">
            공제 <b className="text-red-300">−{won(ded.total)}</b>
          </span>
        </div>
      </div>

      {/* 공제 방식 토글 */}
      <div>
        <p className="px-1 pb-1.5 text-xs font-semibold text-fg-muted">공제 방식</p>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1">
          {(
            [
              { key: "freelance", label: "프리랜서 3.3%" },
              { key: "insurance", label: "4대보험" },
            ] as const
          ).map((m) => {
            const on = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                className={`flex-1 rounded-md py-2 text-[13px] transition-colors ${on ? "bg-primary/15 font-bold text-primary-bright" : "font-medium text-fg-muted"}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
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
          <span className="font-bold text-emerald-300 tabular-nums">{won(gross)}원</span>
        </div>
      </section>

      {/* 공제 내역 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="pb-1 text-sm font-bold">공제 내역</p>
        <div className="divide-y divide-white/5">
          {ded.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-2.5 text-[13px]">
              <span className="text-fg-muted">{r.label}</span>
              <span className="font-semibold tabular-nums">−{won(r.amount)}원</span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-white/10 pt-2.5 text-sm">
          <span className="font-bold">총 공제액</span>
          <span className="font-bold text-red-300 tabular-nums">−{won(ded.total)}원</span>
        </div>
      </section>

      {/* 실지급액 */}
      <section className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-3.5">
        <span className="text-sm font-bold">실지급액</span>
        <span className="text-lg font-bold tabular-nums">{won(net)}원</span>
      </section>

      {/* 산출 근거 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="pb-2 text-sm font-bold">인센티브 산출 근거</p>

        {/* 신규 */}
        <div className="flex items-center justify-between pb-1.5 text-[12px]">
          <span className="font-semibold text-sky-300">신규 등록 {NEW_SALES.length}건 · 40%</span>
          <span className="text-fg-muted tabular-nums">
            매출 {won(newTotal)} → <b className="text-fg">{won(newInc)}원</b>
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {NEW_SALES.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 text-[13px]">
              <span>
                {s.name} <span className="text-fg-muted">· {s.pkg}</span>
              </span>
              <span className="tabular-nums text-fg-muted">{won(s.amount)}원</span>
            </div>
          ))}
        </div>

        {/* 재등록 */}
        <div className="mt-3 flex items-center justify-between pb-1.5 text-[12px]">
          <span className="font-semibold text-violet-300">재등록 {RE_SALES.length}건 · 50%</span>
          <span className="text-fg-muted tabular-nums">
            매출 {won(reTotal)} → <b className="text-fg">{won(reInc)}원</b>
          </span>
        </div>
        <div className="divide-y divide-white/5">
          {RE_SALES.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 text-[13px]">
              <span>
                {s.name} <span className="text-fg-muted">· {s.pkg}</span>
              </span>
              <span className="tabular-nums text-fg-muted">{won(s.amount)}원</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[12px] text-fg-muted">
          <span>세션 싸인</span>
          <span className="tabular-nums">이번 달 {SESSION_SIGNS}회</span>
        </div>
      </section>

      <p className="px-1 text-[11px] leading-relaxed text-fg-muted">
        정산 기준: 기본급은 직급 기준, PT 인센티브는 신규 40% · 재등록 50%. 실적(매출·세션)은 회원 등록·세션지 데이터와 연동돼요.
      </p>
    </div>
  );
}
