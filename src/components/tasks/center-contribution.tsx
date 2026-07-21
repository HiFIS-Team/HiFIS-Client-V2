"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * 센터 기여도
 *
 * 관리자(대표자·점장·팀장)가 특정 직원에게 "이런 기여를 했다"고 점수를 부여한다(투표 아님).
 * - 창의적 아이디어 +5
 * - 자발적 목표 업무 +10
 * - 근무 외 출근 시간당 +3 (시간 입력)
 * - 매출 성과(개인) = 개인 총매출 ÷ 10 × 2.5  ← 매출 연동 자동(데이터 없어 연동 예정)
 *
 * ⚠️ 부여 권한은 대표자·점장·팀장. 지금은 역할 분기 전이라 부여 UI를 살려두고 권한만 표기.
 * 현재 목(로컬 state).
 */

const ME = "은후"; // 현재 사용자 (목)

type Staff = { name: string; role: string };
const STAFF: Staff[] = [
  { name: "은후", role: "트레이너" },
  { name: "지민", role: "트레이너" },
  { name: "현우", role: "트레이너" },
  { name: "서연", role: "데스크 매니저" },
  { name: "민준", role: "점장" },
];

type TypeKey = "idea" | "goal" | "extra";
const TYPE_META: Record<TypeKey, { label: string; emoji: string; points: number; perHour: boolean; tint: string }> = {
  idea: { label: "창의적 아이디어", emoji: "💡", points: 5, perHour: false, tint: "bg-amber-400/15 text-amber-300" },
  goal: { label: "자발적 목표 업무", emoji: "🎯", points: 10, perHour: false, tint: "bg-primary/15 text-primary-bright" },
  extra: { label: "근무 외 출근", emoji: "⏰", points: 3, perHour: true, tint: "bg-sky-400/15 text-sky-300" },
};

type Grant = {
  id: string;
  to: string;
  by: string;
  type: TypeKey;
  hours?: number; // 근무 외 출근일 때
  points: number;
  reason: string;
  offset: number; // 오늘 기준 일수
  time: string; // HH:MM
};

// 부여 내역 (목)
const SEED: Grant[] = [
  { id: "g1", to: "은후", by: "민준", type: "idea", points: 5, reason: "신규 회원 리텐션 이벤트 아이디어 제안", offset: 0, time: "11:20" },
  { id: "g2", to: "지민", by: "민준", type: "goal", points: 10, reason: "여름 그룹 클래스 자발적으로 기획·운영", offset: 0, time: "10:05" },
  { id: "g3", to: "은후", by: "민준", type: "extra", hours: 2, points: 6, reason: "휴무일에 나와 시설 점검 도움", offset: -1, time: "09:30" },
  { id: "g4", to: "현우", by: "민준", type: "idea", points: 5, reason: "인바디 결과 리포트 양식 개선 제안", offset: -2, time: "17:40" },
  { id: "g5", to: "은후", by: "민준", type: "goal", points: 10, reason: "SNS 홍보 콘텐츠 자발적 제작", offset: -3, time: "13:15" },
  { id: "g6", to: "서연", by: "민준", type: "extra", hours: 3, points: 9, reason: "행사 준비로 야간 근무", offset: -4, time: "20:10" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function ampm(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${pad(m)}`;
}
const dayLabel = (offset: number) => (offset === 0 ? "오늘" : offset === -1 ? "어제" : `${-offset}일 전`);

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

const labelCls = "mb-1.5 block text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function CenterContribution() {
  const { show } = useToast();
  const [grants, setGrants] = useState<Grant[]>(SEED);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const idRef = useRef(0);

  // 부여 모달
  const [open, setOpen] = useState(false);
  const [gTo, setGTo] = useState<string | null>(null);
  const [gType, setGType] = useState<TypeKey | null>(null);
  const [gHours, setGHours] = useState("");
  const [gReason, setGReason] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ME가 받은 기여도 집계
  const mine = grants.filter((g) => g.to === ME);
  const sumType = (t: TypeKey) => mine.filter((g) => g.type === t).reduce((a, g) => a + g.points, 0);
  const ideaPts = sumType("idea");
  const goalPts = sumType("goal");
  const extraPts = sumType("extra");
  const extraHours = mine.filter((g) => g.type === "extra").reduce((a, g) => a + (g.hours ?? 0), 0);
  const ideaCnt = mine.filter((g) => g.type === "idea").length;
  const goalCnt = mine.filter((g) => g.type === "goal").length;
  const totalPts = ideaPts + goalPts + extraPts; // 매출 성과는 연동 예정이라 총점 미포함

  const shown = filter === "mine" ? mine : grants;

  const openGrant = () => {
    setGTo(null);
    setGType(null);
    setGHours("");
    setGReason("");
    setOpen(true);
  };

  const previewPts = gType === "extra" ? (Number(gHours) || 0) * TYPE_META.extra.points : gType ? TYPE_META[gType].points : 0;
  const valid = Boolean(gTo && gType && gReason.trim() && (gType !== "extra" || Number(gHours) > 0));

  const submit = () => {
    if (!valid || !gTo || !gType) return;
    idRef.current += 1;
    const hours = gType === "extra" ? Number(gHours) : undefined;
    const points = gType === "extra" ? (hours ?? 0) * TYPE_META.extra.points : TYPE_META[gType].points;
    setGrants((l) => [
      { id: `new-${idRef.current}`, to: gTo, by: ME, type: gType, hours, points, reason: gReason.trim(), offset: 0, time: nowTime() },
      ...l,
    ]);
    setOpen(false);
    show(`${gTo}님에게 ${TYPE_META[gType].label} +${points}점 부여했습니다`);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <p className="text-xs text-fg-muted">
        <span className="font-semibold text-fg">{ME}</span>님이 받은 센터 기여도
      </p>

      {/* 내 기여도 요약 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-end justify-between">
          <span className="text-xs text-fg-muted">총 기여 점수</span>
          <span className="text-2xl font-bold text-primary-bright tabular-nums">{totalPts}점</span>
        </div>
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {[
            { emoji: TYPE_META.idea.emoji, label: "창의적 아이디어", sub: `${ideaCnt}건 × 5`, pts: ideaPts },
            { emoji: TYPE_META.goal.emoji, label: "자발적 목표 업무", sub: `${goalCnt}건 × 10`, pts: goalPts },
            { emoji: TYPE_META.extra.emoji, label: "근무 외 출근", sub: `${extraHours}시간 × 3`, pts: extraPts },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <span>{r.emoji}</span>
              <span className="flex-1">{r.label}</span>
              <span className="text-xs text-fg-muted tabular-nums">{r.sub}</span>
              <span className="w-12 text-right font-semibold tabular-nums">{r.pts}점</span>
            </div>
          ))}
          {/* 매출 성과 — 매출 연동 자동 (데이터 없어 연동 예정) */}
          <div className="flex items-center gap-2 text-sm">
            <span>📈</span>
            <span className="flex-1">매출 성과</span>
            <span className="text-xs text-fg-muted">총매출 ÷ 10 × 2.5</span>
            <span className="w-16 text-right text-xs font-semibold text-fg-muted">연동 예정</span>
          </div>
        </div>
      </section>

      {/* 기여도 부여 (관리자) */}
      <button type="button" onClick={openGrant} className="btn-primary flex w-full items-center justify-center gap-1.5 py-3 text-sm">
        <PlusIcon className="h-4 w-4" />
        기여도 부여
      </button>
      <p className="-mt-1 text-center text-[11px] text-fg-muted">부여 권한: 대표자 · 점장 · 팀장</p>

      {/* 전체 / 내가 받은 필터 */}
      <div className="flex rounded-lg border border-white/10 p-0.5">
        {[
          { key: "all", label: `전체 (${grants.length})` },
          { key: "mine", label: `내가 받은 (${mine.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key as "all" | "mine")}
            className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
              filter === t.key ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 부여 내역 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          부여 내역 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{shown.length}</span>
        </p>
        {shown.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">아직 부여된 기여도가 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {shown.map((g) => {
              const meta = TYPE_META[g.type];
              return (
                <div key={g.id} className="flex gap-3 px-4 py-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: avatarColor(g.to) }}
                  >
                    {g.to[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{g.to}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.tint}`}>
                        {meta.emoji} {meta.label}
                        {g.type === "extra" && g.hours ? ` ${g.hours}h` : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{g.reason}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted/70">
                      {g.by} 부여 · {dayLabel(g.offset)} {ampm(g.time)}
                    </p>
                  </div>
                  <span className="shrink-0 self-start text-xs font-bold text-primary-bright tabular-nums">+{g.points}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 기여도 부여 모달 ── */}
      {open && (
        <div className="overlay-frame fixed inset-0 z-[80] flex items-center justify-center p-5">
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/65" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/12 bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-bold">기여도 부여</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="text-fg-muted transition hover:text-fg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* 직원 선택 */}
              <div>
                <label className={labelCls}>직원</label>
                <div className="flex flex-wrap gap-1.5">
                  {STAFF.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setGTo(s.name)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        gTo === s.name ? "border-primary/50 bg-primary/15 text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s.name}
                      <span className="ml-1 text-[10px] font-normal text-fg-muted">{s.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 유형 선택 */}
              <div>
                <label className={labelCls}>기여 유형</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.keys(TYPE_META) as TypeKey[]).map((k) => {
                    const m = TYPE_META[k];
                    const on = gType === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setGType(k)}
                        className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 transition ${
                          on ? "border-primary/50 bg-primary/10" : "border-white/10"
                        }`}
                      >
                        <span className="text-lg">{m.emoji}</span>
                        <span className="text-[11px] font-semibold leading-tight">{m.label}</span>
                        <span className="text-[10px] text-fg-muted">{m.perHour ? "시간당 +3" : `+${m.points}`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 근무 외 출근이면 시간 입력 */}
              {gType === "extra" && (
                <div>
                  <label className={labelCls}>근무 외 출근 시간</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={gHours}
                      onChange={(e) => setGHours(e.target.value)}
                      placeholder="예) 2"
                      className={`${fieldCls} flex-1`}
                    />
                    <span className="shrink-0 text-sm text-fg-muted">시간</span>
                    <span className="shrink-0 text-sm font-bold text-primary-bright tabular-nums">= {previewPts}점</span>
                  </div>
                </div>
              )}

              {/* 사유 */}
              <div>
                <label className={labelCls}>어떤 기여인지</label>
                <textarea
                  value={gReason}
                  onChange={(e) => setGReason(e.target.value)}
                  rows={3}
                  placeholder="예) 신규 회원 리텐션 이벤트 아이디어 제안"
                  className={`${fieldCls} resize-none`}
                />
              </div>
            </div>

            {/* 하단 부여 버튼 */}
            <div className="kb-safe flex shrink-0 gap-2 border-t border-white/10 p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submit} disabled={!valid} className="btn-primary flex-[1.4] py-2.5 text-sm">
                {gType && gTo ? `+${previewPts}점 부여` : "부여"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
