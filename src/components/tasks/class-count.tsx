"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * 수업 개수 (세션지 / PT 싸인표)
 *
 * 핵심: "수업을 몇 번 했다"는 숫자가 아니라 **회원이 직접 서명한 세션 기록**이 증거다.
 * 싸인 1건 = ①증거(회원·시각·서명) ②점수 +2 ③급여 정산 입력값.
 * 지금은 목(로컬 state) — 회원 도메인이 정식으로 붙으면 이 데이터를 공유로 올린다.
 */

const SCORE_PER = 2; // 세션 싸인 1건당 +2점

type Kind = "신규" | "재등록";
const KIND_STYLE: Record<Kind, string> = {
  신규: "bg-primary/15 text-primary-bright",
  재등록: "bg-sky-400/15 text-sky-300",
};

type Member = {
  id: string;
  name: string;
  kind: Kind; // 등록 구분 (신규 40% / 재등록 50% 인센티브)
  total: number; // 총 세션 수
  used: number; // 싸인한 수
  introducer?: string; // 소개자
};

type Sign = {
  id: string;
  memberId: string;
  memberName: string;
  kind: Kind;
  sessionNo: number; // 이 싸인이 몇 회차인지
  total: number;
  offset: number; // 오늘 기준 일수 (0=오늘, 음수=과거)
  time: string; // HH:MM
  signature: string; // 서명 이미지 (dataURL)
};

// 시드 서명(SVG 낙서) — 실제 싸인은 캔버스가 만든 PNG dataURL
const sig = (d: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 44'><path d='${d}' fill='none' stroke='#141414' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/></svg>`,
  );
const SIG1 = sig("M6 30 C18 6 26 6 30 26 S44 44 52 22 68 8 80 28 96 40 114 16");
const SIG2 = sig("M8 24 q10 -18 20 0 t20 0 20 0 20 0 M72 12 l18 24");
const SIG3 = sig("M6 34 C20 10 30 40 44 20 S66 4 78 30 100 38 116 20");

const MEMBERS0: Member[] = [
  { id: "m1", name: "김서준", kind: "신규", total: 10, used: 3 },
  { id: "m2", name: "이하은", kind: "재등록", total: 20, used: 18 },
  { id: "m3", name: "박도윤", kind: "신규", total: 10, used: 10 }, // 만료
  { id: "m4", name: "최지우", kind: "재등록", total: 30, used: 12, introducer: "이하은" },
  { id: "m5", name: "정유나", kind: "신규", total: 5, used: 1 },
];

const SIGNS0: Sign[] = [
  { id: "s1", memberId: "m2", memberName: "이하은", kind: "재등록", sessionNo: 18, total: 20, offset: 0, time: "10:20", signature: SIG1 },
  { id: "s2", memberId: "m1", memberName: "김서준", kind: "신규", sessionNo: 3, total: 10, offset: 0, time: "09:10", signature: SIG2 },
  { id: "s3", memberId: "m4", memberName: "최지우", kind: "재등록", sessionNo: 12, total: 30, offset: -1, time: "18:40", signature: SIG3 },
  { id: "s4", memberId: "m1", memberName: "김서준", kind: "신규", sessionNo: 2, total: 10, offset: -1, time: "11:05", signature: SIG1 },
  { id: "s5", memberId: "m5", memberName: "정유나", kind: "신규", sessionNo: 1, total: 5, offset: -3, time: "14:30", signature: SIG2 },
  { id: "s6", memberId: "m3", memberName: "박도윤", kind: "신규", sessionNo: 10, total: 10, offset: -6, time: "16:15", signature: SIG3 },
];

const pad = (n: number) => String(n).padStart(2, "0");
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
// "14:25" → "오후 2:25"
function ampm(t: string) {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${pad(m)}`;
}
// offset만으로 상대 날짜 (today를 state에 안 둬서 SSR 안전 + lint 영향 없음)
const dayLabel = (offset: number) => (offset === 0 ? "오늘" : offset === -1 ? "어제" : `${-offset}일 전`);

/* ── 아이콘 ─────────────────────────────────────── */
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
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function PenIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" />
      <path d="m14 7 3 3" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/* ── 서명 패드 (캔버스) ─────────────────────────── */
function SignaturePad({ onChange }: { onChange: (url: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  // 마운트 시 캔버스를 실제 픽셀(devicePixelRatio) 크기로 맞춘다 (선이 또렷하게)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#141414";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    c.setPointerCapture(e.pointerId);
    const ctx = c.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
    if (empty) setEmpty(false);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(canvasRef.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg bg-[#f5f5f7]">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          className="h-44 w-full touch-none"
        />
        {/* 서명선 + 안내 (비어 있을 때만) */}
        <span className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-dashed border-black/25" />
        {empty && (
          <span className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-xs text-black/30">
            여기에 회원 서명
          </span>
        )}
      </div>
      <button type="button" onClick={clear} className="mt-2 text-xs text-fg-muted underline underline-offset-2">
        다시 서명
      </button>
    </div>
  );
}

/* ── 메인 ───────────────────────────────────────── */
export function ClassCount() {
  const { show } = useToast();
  const [members, setMembers] = useState<Member[]>(MEMBERS0);
  const [signs, setSigns] = useState<Sign[]>(SIGNS0);
  const idRef = useRef(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [pickId, setPickId] = useState<string | null>(null); // 서명 대상 회원
  const [query, setQuery] = useState("");
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [detail, setDetail] = useState<Sign | null>(null); // 기록 상세(서명 확대)

  // ESC: 상세 > 서명 패널 순으로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detail) setDetail(null);
      else if (panelOpen) setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, detail]);

  const totalSessions = signs.length;
  const totalScore = totalSessions * SCORE_PER;
  const activeMembers = members.filter((m) => m.used < m.total).length;
  const pickMember = members.find((m) => m.id === pickId) ?? null;

  const q = query.trim();
  const shownMembers = members.filter((m) => q === "" || m.name.includes(q));

  const openSign = () => {
    setPickId(null);
    setQuery("");
    setSigUrl(null);
    setPanelOpen(true);
  };
  const choose = (m: Member) => {
    if (m.used >= m.total) return; // 만료 회원은 선택 불가
    setSigUrl(null);
    setPickId(m.id);
  };
  const confirmSign = () => {
    if (!pickMember || !sigUrl) return;
    const nextUsed = pickMember.used + 1;
    idRef.current += 1;
    const rec: Sign = {
      id: `new-${idRef.current}`,
      memberId: pickMember.id,
      memberName: pickMember.name,
      kind: pickMember.kind,
      sessionNo: nextUsed,
      total: pickMember.total,
      offset: 0,
      time: nowTime(),
      signature: sigUrl,
    };
    setSigns((l) => [rec, ...l]);
    setMembers((l) => l.map((m) => (m.id === pickMember.id ? { ...m, used: nextUsed } : m)));
    setPanelOpen(false);
    const newScore = (signs.length + 1) * SCORE_PER;
    const expired = nextUsed >= pickMember.total ? " · 세션 만료" : "";
    show(`${pickMember.name} ${nextUsed}회차 싸인 완료 (+${SCORE_PER}점, 누적 ${newScore}점)${expired}`);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      {/* 요약 — 수업 개수는 곧 서명 기록의 개수 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "누적 수업", value: `${totalSessions}회` },
          { label: "누적 점수", value: `${totalScore}점`, accent: true },
          { label: "진행 중 회원", value: `${activeMembers}명` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-surface px-3 py-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.accent ? "text-primary-bright" : ""}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <button type="button" onClick={openSign} className="btn-primary flex w-full items-center justify-center gap-1.5 py-3 text-sm">
        <PenIcon className="h-4 w-4" />
        세션 싸인 받기
      </button>

      {/* 세션 기록 — 각 행이 곧 "진짜 수업했다"는 증거 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          세션 기록 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{signs.length}</span>
        </p>
        <div className="divide-y divide-white/5">
          {signs.map((s) => (
            <button key={s.id} type="button" onClick={() => setDetail(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              {/* 서명 썸네일 (종이 느낌 흰 박스) */}
              <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#f5f5f7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.signature} alt="서명" className="h-full w-full object-contain p-1" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-bold">{s.memberName}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[s.kind]}`}>{s.kind}</span>
                </span>
                <span className="mt-0.5 block text-[11px] text-fg-muted">
                  {s.sessionNo}/{s.total}회차 · {dayLabel(s.offset)} {ampm(s.time)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}</span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
            </button>
          ))}
        </div>
      </section>

      {/* 회원 세션권 현황 — 회차 차감/만료가 보이게 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          회원 세션권 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{members.length}</span>
        </p>
        <div className="divide-y divide-white/5">
          {members.map((m) => {
            const left = m.total - m.used;
            const expired = left <= 0;
            return (
              <div key={m.id} className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{m.name}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[m.kind]}`}>{m.kind}</span>
                  {m.introducer && <span className="truncate text-[11px] text-fg-muted">· {m.introducer} 소개</span>}
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      expired ? "bg-red-500/12 text-red-400" : "bg-white/8 text-fg-muted"
                    }`}
                  >
                    {expired ? "만료" : `${left}회 남음`}
                  </span>
                </div>
                {/* 진행 바 */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full ${expired ? "bg-red-400/70" : "bg-primary"}`}
                    style={{ width: `${Math.round((m.used / m.total) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 세션 싸인 패널 (오른쪽 → 왼쪽 슬라이드) ── */}
      <div
        role="dialog"
        aria-label="세션 싸인"
        inert={!panelOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => (pickMember ? setPickId(null) : setPanelOpen(false))}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
            {pickMember ? "회원 서명" : "회원 선택"}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!pickMember ? (
            <>
              {/* 검색 */}
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
                <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="회원 이름 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
                />
              </div>
              <div className="space-y-2">
                {shownMembers.map((m) => {
                  const left = m.total - m.used;
                  const expired = left <= 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => choose(m)}
                      disabled={expired}
                      className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left ${
                        expired ? "opacity-40" : ""
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary-bright">
                        {m.name[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold">{m.name}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[m.kind]}`}>{m.kind}</span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-fg-muted">
                          {m.used}/{m.total}회차 사용
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          expired ? "bg-red-500/12 text-red-400" : "bg-white/8 text-fg-muted"
                        }`}
                      >
                        {expired ? "만료" : `${left}회 남음`}
                      </span>
                    </button>
                  );
                })}
                {shownMembers.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">
                    ‘{q}’ 회원을 찾을 수 없어요.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* 선택된 회원 요약 */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary-bright">
                  {pickMember.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{pickMember.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[pickMember.kind]}`}>
                      {pickMember.kind}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    이번이 <span className="font-semibold text-fg">{pickMember.used + 1}회차</span> · 서명 후{" "}
                    {pickMember.total - pickMember.used - 1}회 남음
                  </p>
                </div>
              </div>

              <p className="text-xs text-fg-muted">아래에 회원이 직접 서명하면 1회 차감되고 +{SCORE_PER}점이 쌓입니다.</p>
              <SignaturePad onChange={setSigUrl} />
            </div>
          )}
        </div>

        {/* 하단 확정 버튼 */}
        <div className="kb-safe shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={confirmSign}
            disabled={!pickMember || !sigUrl}
            className="btn-primary w-full py-3 text-sm"
          >
            {!pickMember ? "회원을 선택하세요" : !sigUrl ? "서명을 받아주세요" : `싸인 완료 · +${SCORE_PER}점`}
          </button>
        </div>
      </div>

      {/* ── 기록 상세 (서명 확대) ── */}
      {detail && (
        <div className="overlay-frame fixed inset-0 z-[80] flex items-center justify-center p-6">
          <button type="button" aria-label="닫기" onClick={() => setDetail(null)} className="absolute inset-0 bg-black/65" />
          <div className="animate-page-in relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-bold">세션 기록</p>
              <button type="button" onClick={() => setDetail(null)} aria-label="닫기" className="text-fg-muted transition hover:text-fg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            {/* 서명 확대 (증거) */}
            <div className="mx-4 overflow-hidden rounded-lg bg-[#f5f5f7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={detail.signature} alt="회원 서명" className="h-40 w-full object-contain p-3" />
            </div>
            <div className="space-y-2 p-4 text-sm">
              <Row label="회원">
                <span className="font-semibold">{detail.memberName}</span>
                <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[detail.kind]}`}>{detail.kind}</span>
              </Row>
              <Row label="회차">
                {detail.sessionNo} / {detail.total}회차
              </Row>
              <Row label="시각">
                {dayLabel(detail.offset)} {ampm(detail.time)}
              </Row>
              <Row label="점수">
                <span className="font-semibold text-primary-bright">+{SCORE_PER}점</span>
              </Row>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-fg-muted">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
