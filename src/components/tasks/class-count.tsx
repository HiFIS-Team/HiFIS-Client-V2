"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { ApiError, assetUrl } from "@/lib/api/client";
import {
  createMember,
  createRegistration,
  createSessionSign,
  listMembers,
  listRegistrations,
  listSessionSigns,
  memberRegistrations,
  type MemberDTO,
  type RegistrationDTO,
  type RegType,
  type SessionSignDTO,
} from "@/lib/api/hifis";

/**
 * 수업 개수 (세션지 / PT 싸인표) — **백엔드 연동(Phase 2)**.
 *
 * 핵심: "수업을 몇 번 했다"는 숫자가 아니라 **회원이 직접 서명한 세션 기록**이 증거다.
 * 싸인 1건 = ①증거(회원·시각·서명) ②CLASS 점수 +2 ③급여 정산 입력값.
 * 이 탭은 **로그인한 트레이너 본인이 수행한 세션**만 본다(회원·기록·담당 전부 내 것).
 * 담당 트레이너(회원 소유) vs 수행 트레이너(이 수업을 한 사람) 분리 — 대타면 다름.
 */

const SCORE_PER = 2; // 세션 싸인 1건당 +2점

const kindLabel = (t: RegistrationDTO["type"]) => (t === "NEW" ? "신규" : "재등록");
const KIND_STYLE: Record<string, string> = {
  신규: "bg-primary/15 text-primary-bright",
  재등록: "bg-sky-400/15 text-sky-300",
};

const pad = (n: number) => String(n).padStart(2, "0");
// ISO(UTC) → "M.D 오후 h:mm" (로컬 시각). new Date(고정 문자열)이라 순수.
function fmtSignedAt(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

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
function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19a6 6 0 0 0-12 0" />
      <circle cx="9" cy="8" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

const regLabel = "mb-1.5 block text-[13px] font-bold";
const regField = "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/* ── 서명 패드 (캔버스) → PNG dataURL(=signatureBase64) ── */
function SignaturePad({ onChange }: { onChange: (url: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

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
        <span className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-dashed border-black/25" />
        {empty && (
          <span className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 text-xs text-black/30">여기에 회원 서명</span>
        )}
      </div>
      <button type="button" onClick={clear} className="mt-2 text-xs text-fg-muted underline underline-offset-2">
        다시 서명
      </button>
    </div>
  );
}

// 내 스코프 데이터 3종 병렬 로드 (지점 회원 전체 + 내 등록 + 내가 수행한 세션)
const fetchAll = (trainerId: string) =>
  Promise.all([listMembers(), listRegistrations({ trainerId }), listSessionSigns({ trainerId })]);

/* ── 메인 ───────────────────────────────────────── */
export function ClassCount() {
  const { show } = useToast();
  const { user } = useAuth();
  const meId = user?.id;
  const branchId = user?.branchId;

  const [members, setMembers] = useState<MemberDTO[]>([]); // 지점 전체(대타용) — 내 것 포함
  const [myRegs, setMyRegs] = useState<RegistrationDTO[]>([]); // 내가 담당인 등록
  const [signs, setSigns] = useState<SessionSignDTO[]>([]); // 내가 수행한 세션
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const [pickMember, setPickMember] = useState<MemberDTO | null>(null);
  const [pickReg, setPickReg] = useState<RegistrationDTO | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [sigUrl, setSigUrl] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [detail, setDetail] = useState<SessionSignDTO | null>(null);

  // 회원 등록 패널 (신규 회원 / 재등록)
  const [regOpen, setRegOpen] = useState(false);
  const [regMode, setRegMode] = useState<"new" | "renew">("new");
  const [rName, setRName] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rReferrer, setRReferrer] = useState<MemberDTO | null>(null); // 소개한 회원(선택)
  const [rRefQuery, setRRefQuery] = useState("");
  const [rMember, setRMember] = useState<MemberDTO | null>(null); // 재등록 대상
  const [rMemQuery, setRMemQuery] = useState("");
  const [rSessions, setRSessions] = useState("");
  const [rPrice, setRPrice] = useState("");
  const [rUnit, setRUnit] = useState("20000");
  const [registering, setRegistering] = useState(false);

  // 최초 로드 — 효과 본문에 동기 setState 없이 .then 체인으로 (set-state-in-effect 회피)
  useEffect(() => {
    if (!meId) return;
    let alive = true;
    fetchAll(meId)
      .then(([ms, rs, ss]) => {
        if (!alive) return;
        setMembers(ms);
        setMyRegs(rs);
        setSigns(ss);
        setLoadErr(false);
      })
      .catch(() => {
        if (alive) setLoadErr(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [meId]);

  // 재조회 (이벤트 핸들러용 — 싸인 후·재시도)
  const reload = async () => {
    if (!meId) return;
    try {
      const [ms, rs, ss] = await fetchAll(meId);
      setMembers(ms);
      setMyRegs(rs);
      setSigns(ss);
      setLoadErr(false);
    } catch {
      setLoadErr(true);
    }
  };

  // ESC: 상세 > 서명 패널 순으로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detail) setDetail(null);
      else if (regOpen) setRegOpen(false);
      else if (panelOpen) setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, detail, regOpen]);

  /* 파생 */
  const memberById = new Map(members.map((m) => [m.id, m]));
  const regById = new Map(myRegs.map((r) => [r.id, r]));
  // 회원별 활성 등록 (내 담당) — ACTIVE 우선
  const activeRegByMember = new Map<string, RegistrationDTO>();
  for (const r of myRegs) {
    const cur = activeRegByMember.get(r.memberId);
    if (!cur || (r.status === "ACTIVE" && cur.status !== "ACTIVE")) activeRegByMember.set(r.memberId, r);
  }
  const myMembers = members.filter((m) => m.ownerTrainerId === meId);

  const totalSessions = signs.length;
  const totalScore = totalSessions * SCORE_PER;
  const activeMembers = myMembers.filter((m) => {
    const r = activeRegByMember.get(m.id);
    return r && r.status === "ACTIVE";
  }).length;

  const q = query.trim();
  const pickBase = showAll ? members : myMembers;
  const shownMembers = pickBase.filter((m) => q === "" || m.name.includes(q));

  const openSign = () => {
    setPickMember(null);
    setPickReg(null);
    setQuery("");
    setShowAll(false);
    setSigUrl(null);
    setPanelOpen(true);
  };

  const choose = async (m: MemberDTO) => {
    let reg = activeRegByMember.get(m.id) ?? null;
    if (!reg) {
      // 대타(내 담당 아님) 등 등록 미로딩분 — 해당 회원 등록 조회
      try {
        const regs = await memberRegistrations(m.id);
        reg = regs.find((r) => r.status === "ACTIVE") ?? regs[0] ?? null;
      } catch {
        reg = null;
      }
    }
    if (!reg) {
      show(`${m.name}님은 등록된 세션권이 없어요`, "cancel");
      return;
    }
    if (reg.status === "EXPIRED" || reg.usedSessions >= reg.totalSessions) {
      show(`${m.name}님 세션이 만료됐어요`, "cancel");
      return;
    }
    setSigUrl(null);
    setPickMember(m);
    setPickReg(reg);
  };

  const confirmSign = async () => {
    if (!pickMember || !pickReg || !sigUrl || signing) return;
    setSigning(true);
    try {
      const res = await createSessionSign({ registrationId: pickReg.id, signatureBase64: sigUrl });
      const expired = res.registration.status === "EXPIRED" ? " · 세션 만료" : "";
      const newScore = (signs.length + 1) * SCORE_PER;
      show(`${pickMember.name} ${res.sign.sessionNo}회차 싸인 완료 (+${SCORE_PER}점, 누적 ${newScore}점)${expired}`);
      setPanelOpen(false);
      setPickMember(null);
      setPickReg(null);
      setSigUrl(null);
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === "NO_SESSIONS_LEFT") show(`${pickMember.name}님 남은 세션이 없어요`, "cancel");
      else show("싸인 저장에 실패했어요", "cancel");
    } finally {
      setSigning(false);
    }
  };

  /* 회원 등록 */
  const openReg = () => {
    setRegMode("new");
    setRName("");
    setRPhone("");
    setRReferrer(null);
    setRRefQuery("");
    setRMember(null);
    setRMemQuery("");
    setRSessions("");
    setRPrice("");
    setRUnit("20000");
    setRegOpen(true);
  };

  const rSess = Number(rSessions) || 0;
  const rPr = Number(rPrice) || 0;
  const rUn = Number(rUnit) || 0;
  const regValid =
    rSess > 0 && rPr >= 0 && rUn >= 0 && (regMode === "new" ? rName.trim() !== "" && rPhone.trim() !== "" : !!rMember);

  const refMatches = rRefQuery.trim() ? members.filter((m) => m.name.includes(rRefQuery.trim())).slice(0, 8) : [];
  const renewMatches = members.filter((m) => rMemQuery.trim() === "" || m.name.includes(rMemQuery.trim()));

  const submitReg = async () => {
    if (!regValid || registering || !meId || !branchId) return;
    setRegistering(true);
    const type: RegType = regMode === "new" ? "NEW" : "RENEWAL";
    try {
      let memberId: string;
      let memberName: string;
      if (regMode === "new") {
        const m = await createMember({
          name: rName.trim(),
          phone: rPhone.trim(),
          branchId,
          ownerTrainerId: meId,
          referrerMemberId: rReferrer?.id,
        });
        memberId = m.id;
        memberName = m.name;
      } else {
        memberId = rMember!.id;
        memberName = rMember!.name;
      }
      await createRegistration({ memberId, trainerId: meId, type, totalSessions: rSess, pricePaid: rPr, sessionUnitPrice: rUn });
      show(`${memberName}님 ${type === "NEW" ? "신규 등록" : "재등록"} 완료 · ${rSess}회`);
      setRegOpen(false);
      await reload();
    } catch (e) {
      show(e instanceof ApiError ? e.message || "등록에 실패했어요" : "등록에 실패했어요", "cancel");
    } finally {
      setRegistering(false);
    }
  };

  const detailMember = detail ? memberById.get(detail.memberId) : null;
  const detailReg = detail ? regById.get(detail.registrationId) : null;
  const detailSubstitute = detail && detailMember ? detailMember.ownerTrainerId !== detail.performedByTrainerId : false;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <p className="text-xs text-fg-muted">
        <span className="font-semibold text-fg">{user?.name ?? "나"} 트레이너</span> · 내가 수행한 세션
      </p>

      {/* 요약 */}
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

      <div className="flex gap-2">
        <button type="button" onClick={openReg} className="btn-secondary flex flex-1 items-center justify-center gap-1.5 py-3 text-sm">
          <UserPlusIcon className="h-4 w-4" />
          회원 등록
        </button>
        <button type="button" onClick={openSign} className="btn-primary flex flex-1 items-center justify-center gap-1.5 py-3 text-sm">
          <PenIcon className="h-4 w-4" />
          세션 싸인 받기
        </button>
      </div>

      {loadErr && (
        <button type="button" onClick={reload} className="w-full rounded-2xl border border-red-500/25 bg-red-500/[0.06] px-4 py-3 text-center text-sm text-red-300">
          데이터를 불러오지 못했어요. 탭해서 다시 시도
        </button>
      )}

      {/* 세션 기록 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          세션 기록 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{signs.length}</span>
        </p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : signs.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 세션 기록이 없어요. 위에서 싸인을 받아보세요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {signs.map((s) => {
              const name = memberById.get(s.memberId)?.name ?? "회원";
              const reg = regById.get(s.registrationId);
              const kind = reg ? kindLabel(reg.type) : null;
              return (
                <button key={s.id} type="button" onClick={() => setDetail(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded bg-[#f5f5f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={assetUrl(s.signatureUrl)} alt="서명" className="h-full w-full object-contain p-1" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold">{name}</span>
                      {kind && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kind]}`}>{kind}</span>}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-fg-muted">
                      {s.sessionNo}
                      {reg ? `/${reg.totalSessions}` : ""}회차 · {fmtSignedAt(s.signedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}</span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 내 담당 회원 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          내 담당 회원 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{myMembers.length}</span>
        </p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : myMembers.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">담당 회원이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {myMembers.map((m) => {
              const reg = activeRegByMember.get(m.id);
              const total = reg?.totalSessions ?? 0;
              const used = reg?.usedSessions ?? 0;
              const left = total - used;
              const expired = !reg || reg.status === "EXPIRED" || left <= 0;
              const kind = reg ? kindLabel(reg.type) : null;
              return (
                <div key={m.id} className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{m.name}</span>
                    {kind && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kind]}`}>{kind}</span>}
                    <span
                      className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        expired ? "bg-red-500/12 text-red-400" : "bg-white/8 text-fg-muted"
                      }`}
                    >
                      {!reg ? "등록 없음" : expired ? "만료" : `${left}회 남음`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div
                      className={`h-full rounded-full ${expired ? "bg-red-400/70" : "bg-primary"}`}
                      style={{ width: `${total > 0 ? Math.round((used / total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
            onClick={() => {
              if (pickMember) {
                setPickMember(null);
                setPickReg(null);
              } else {
                setPanelOpen(false);
              }
            }}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">{pickMember ? "회원 서명" : "회원 선택"}</h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {!pickMember ? (
            <>
              <div className="mb-2.5 flex rounded-lg border border-white/10 p-0.5">
                {[
                  { key: false, label: `내 담당 (${myMembers.length})` },
                  { key: true, label: "전체" },
                ].map((t) => (
                  <button
                    key={String(t.key)}
                    type="button"
                    onClick={() => setShowAll(t.key)}
                    className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                      showAll === t.key ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
                <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="회원 이름 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
                />
              </div>
              {showAll && <p className="mb-2 text-[11px] text-fg-muted">다른 트레이너 담당 회원은 대타 수업으로 기록됩니다.</p>}
              <div className="space-y-2">
                {shownMembers.map((m) => {
                  const mine = m.ownerTrainerId === meId;
                  const reg = activeRegByMember.get(m.id);
                  const total = reg?.totalSessions ?? 0;
                  const used = reg?.usedSessions ?? 0;
                  const left = total - used;
                  const expired = !!reg && (reg.status === "EXPIRED" || left <= 0);
                  const kind = reg ? kindLabel(reg.type) : null;
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
                          {kind && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kind]}`}>{kind}</span>}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-fg-muted">
                          {reg ? `${used}/${total}회차 사용 · ` : ""}
                          {mine ? "내 담당" : "다른 트레이너 담당"}
                        </span>
                      </span>
                      {reg && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            expired ? "bg-red-500/12 text-red-400" : "bg-white/8 text-fg-muted"
                          }`}
                        >
                          {expired ? "만료" : `${left}회 남음`}
                        </span>
                      )}
                    </button>
                  );
                })}
                {shownMembers.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">
                    {q ? `‘${q}’ 회원을 찾을 수 없어요.` : "담당 회원이 없어요. ‘전체’에서 대타를 선택하세요."}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary-bright">
                  {pickMember.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-bold">{pickMember.name}</span>
                    {pickReg && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kindLabel(pickReg.type)]}`}>
                        {kindLabel(pickReg.type)}
                      </span>
                    )}
                  </div>
                  {pickReg && (
                    <p className="mt-0.5 text-[11px] text-fg-muted">
                      이번이 <span className="font-semibold text-fg">{pickReg.usedSessions + 1}회차</span> · 서명 후{" "}
                      {pickReg.totalSessions - pickReg.usedSessions - 1}회 남음
                    </p>
                  )}
                </div>
              </div>

              <p className="text-xs text-fg-muted">아래에 회원이 직접 서명하면 1회 차감되고 +{SCORE_PER}점이 쌓입니다.</p>
              <SignaturePad onChange={setSigUrl} />
            </div>
          )}
        </div>

        <div className="kb-safe shrink-0 border-t border-white/10 p-4">
          <button type="button" onClick={confirmSign} disabled={!pickMember || !sigUrl || signing} className="btn-primary w-full py-3 text-sm">
            {signing ? "저장 중…" : !pickMember ? "회원을 선택하세요" : !sigUrl ? "서명을 받아주세요" : `싸인 완료 · +${SCORE_PER}점`}
          </button>
        </div>
      </div>

      {/* ── 회원 등록 패널 (오른쪽 → 왼쪽 슬라이드) ── */}
      <div
        role="dialog"
        aria-label="회원 등록"
        inert={!regOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          regOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button type="button" onClick={() => setRegOpen(false)} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">회원 등록</h1>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* 모드 토글 */}
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {[
              { key: "new" as const, label: "신규 회원" },
              { key: "renew" as const, label: "재등록" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setRegMode(t.key)}
                className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition ${
                  regMode === t.key ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {regMode === "new" ? (
            <>
              <div>
                <label className={regLabel}>성함</label>
                <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="회원 성함" className={regField} />
              </div>
              <div>
                <label className={regLabel}>연락처</label>
                <input value={rPhone} onChange={(e) => setRPhone(e.target.value)} inputMode="tel" placeholder="010-0000-0000" className={regField} />
              </div>
              <div>
                <label className={regLabel}>
                  소개한 회원 <span className="font-normal text-fg-muted">(선택)</span>
                </label>
                {rReferrer ? (
                  <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
                    <span className="text-[13px] font-semibold text-primary-bright">{rReferrer.name}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRReferrer(null);
                        setRRefQuery("");
                      }}
                      aria-label="소개자 지우기"
                      className="text-fg-muted"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input value={rRefQuery} onChange={(e) => setRRefQuery(e.target.value)} placeholder="소개한 회원 이름 검색" className={regField} />
                    {refMatches.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {refMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setRReferrer(m)}
                            className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-fg-muted transition hover:border-primary/40"
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className={regLabel}>재등록할 회원</label>
              {rMember ? (
                <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5">
                  <span className="text-[13px] font-semibold text-primary-bright">{rMember.name}</span>
                  <button type="button" onClick={() => setRMember(null)} aria-label="회원 지우기" className="text-fg-muted">
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <input value={rMemQuery} onChange={(e) => setRMemQuery(e.target.value)} placeholder="회원 이름 검색" className={regField} />
                  <div className="mt-1.5 space-y-1.5">
                    {renewMatches.slice(0, 20).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRMember(m)}
                        className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-[13px] transition hover:border-primary/40"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary-bright">{m.name[0]}</span>
                        <span className="truncate font-semibold">{m.name}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-fg-muted">{m.ownerTrainerId === meId ? "내 담당" : "타 담당"}</span>
                      </button>
                    ))}
                    {renewMatches.length === 0 && <p className="px-1 py-6 text-center text-xs text-fg-muted">회원을 찾을 수 없어요.</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {/* 공통 — 등록권 */}
          <div className="space-y-4 border-t border-white/10 pt-4">
            <div>
              <label className={regLabel}>회차</label>
              <div className="flex items-center gap-2">
                <input type="number" min={1} value={rSessions} onChange={(e) => setRSessions(e.target.value)} placeholder="예) 30" className={`${regField} flex-1`} />
                <span className="shrink-0 text-sm text-fg-muted">회</span>
              </div>
            </div>
            <div>
              <label className={regLabel}>결제액</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={rPrice} onChange={(e) => setRPrice(e.target.value)} placeholder="예) 1500000" className={`${regField} flex-1`} />
                <span className="shrink-0 text-sm text-fg-muted">원</span>
              </div>
            </div>
            <div>
              <label className={regLabel}>세션 단가</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={rUnit} onChange={(e) => setRUnit(e.target.value)} className={`${regField} flex-1`} />
                <span className="shrink-0 text-sm text-fg-muted">원 / 회</span>
              </div>
            </div>
          </div>
        </div>

        <div className="kb-safe shrink-0 border-t border-white/10 p-4">
          <button type="button" onClick={submitReg} disabled={!regValid || registering} className="btn-primary w-full py-3 text-sm">
            {registering ? "등록 중…" : regMode === "new" ? "신규 회원 등록" : "재등록"}
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
            <div className="mx-4 overflow-hidden rounded-lg bg-[#f5f5f7]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(detail.signatureUrl)} alt="회원 서명" className="h-40 w-full object-contain p-3" />
            </div>
            <div className="space-y-2 p-4 text-sm">
              <Row label="회원">
                <span className="font-semibold">{detailMember?.name ?? "회원"}</span>
                {detailReg && (
                  <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kindLabel(detailReg.type)]}`}>
                    {kindLabel(detailReg.type)}
                  </span>
                )}
              </Row>
              <Row label="회차">
                {detail.sessionNo}
                {detailReg ? ` / ${detailReg.totalSessions}` : ""}회차
              </Row>
              <Row label="수행 트레이너">
                <span className="font-semibold">{user?.name ?? "나"}</span>
                {detailSubstitute && <span className="ml-1.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">대타</span>}
              </Row>
              <Row label="시각">{fmtSignedAt(detail.signedAt)}</Row>
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
