"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { useNavTargetFor } from "@/hooks/nav-target";
import { createNotice, listNotices, toggleReaction, type NoticeDTO } from "@/lib/api/hifis";

/**
 * 사내공지 — **백엔드 연동(Phase 5)**.
 *
 * 회사 내부 공지(알림[푸시 수신]과 별개). 읽기는 전 직원, **작성은 ADMIN·MANAGER만**(POST /notices).
 * 이모지 반응은 `/reactions` 토글. ⚠️ 작성자 이름은 직원 명단 권한 갭 → 내 것이면 내 이름, 아니면 "관리자".
 */

const QUICK_EMOJI = ["👍", "❤️", "🎉", "👀", "🙏", "😂"];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

/* ── 아이콘 ─────────────────────────────────────── */
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 0 0-13.7-5.7L4 7.5" />
      <path d="M4 4v3.5h3.5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.7L20 16.5" />
      <path d="M20 20v-3.5h-3.5" />
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
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}
function SmilePlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12a8.5 8.5 0 1 1-6-8.1" />
      <path d="M9 10h.01M15 10h.01" />
      <path d="M8.5 14.5a4.5 4.5 0 0 0 6.4.3" />
      <path d="M18 3v5M20.5 5.5h-5" />
    </svg>
  );
}
function PinBadge() {
  return (
    <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
      <BoltIcon className="h-2.5 w-2.5" />
      고정
    </span>
  );
}

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Notices() {
  const { show } = useToast();
  const { user } = useAuth();
  const meId = user?.id;
  const canWrite = user?.role === "ADMIN" || user?.role === "MANAGER";
  const nav = useNavTargetFor("/notices");

  const [items, setItems] = useState<NoticeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(nav?.id ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 작성 모달
  const [writeOpen, setWriteOpen] = useState(false);
  const [wTitle, setWTitle] = useState("");
  const [wContent, setWContent] = useState("");
  const [wPin, setWPin] = useState(false);
  const [posting, setPosting] = useState(false);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    listNotices()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!writeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setWriteOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [writeOpen]);

  useEffect(() => {
    if (!detailId) return;
    const t = setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [detailId]);

  const refresh = async () => {
    setBusy(true);
    try {
      setItems(await listNotices());
    } catch {
      /* 무시 */
    }
    setBusy(false);
    show("공지를 새로고침했습니다");
  };

  // 고정 먼저, 그다음 최신순
  const list = [...items].sort((a, b) => (a.pinned === b.pinned ? (a.createdAt < b.createdAt ? 1 : -1) : a.pinned ? -1 : 1));
  const detail = detailId ? items.find((a) => a.id === detailId) ?? null : null;

  const authorLabel = (authorId: string) => (authorId === meId ? user?.name ?? "나" : "관리자");
  const reactionsOf = (n: NoticeDTO) =>
    n.reactions.map((r) => ({ emoji: r.emoji, count: r.employeeIds.length, mine: meId ? r.employeeIds.includes(meId) : false }));

  const react = async (id: string, emoji: string) => {
    setPickerOpen(false);
    try {
      const res = await toggleReaction({ targetType: "NOTICE", targetId: id, emoji });
      setItems((l) => l.map((n) => (n.id === id ? { ...n, reactions: res.reactions } : n)));
    } catch {
      show("반응에 실패했어요", "cancel");
    }
  };

  const openWrite = () => {
    setWTitle("");
    setWContent("");
    setWPin(false);
    setWriteOpen(true);
  };

  const submitWrite = async () => {
    const t = wTitle.trim();
    const c = wContent.trim();
    if (!t || !c || posting) return;
    setPosting(true);
    try {
      const n = await createNotice({ title: t, body: c, pinned: wPin });
      setItems((l) => [n, ...l]);
      setWriteOpen(false);
      show("공지를 등록했습니다");
    } catch {
      show("공지 등록에 실패했어요", "cancel");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      <div>
        <h1 className="text-xl font-bold">사내공지</h1>
      </div>

      {/* 새로고침 · 공지 작성(관리자만) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          aria-label="새로고침"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
        >
          <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </button>
        {canWrite && (
          <button type="button" onClick={openWrite} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[13px]">
            <PlusIcon className="h-3.5 w-3.5" />
            공지 작성
          </button>
        )}
      </div>

      {/* 공지 목록 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2.5 pt-3.5 text-sm font-bold">공지 목록 ({items.length})</p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="px-4 pb-6 text-center text-sm text-fg-muted">아직 공지가 없어요.</p>
        ) : (
          <div className="divide-y divide-white/8 border-t border-white/8">
            {list.map((a) => {
              const on = a.id === detailId;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setDetailId((cur) => (cur === a.id ? null : a.id));
                    setPickerOpen(false);
                  }}
                  className={`block w-full px-4 py-3 text-left transition-colors ${on ? "bg-primary/10" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {a.pinned && <PinBadge />}
                    <span className={`min-w-0 truncate text-sm font-bold ${on ? "text-primary-bright" : ""}`}>{a.title}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    {authorLabel(a.authorId)} · {fmtDate(a.createdAt)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 상세 — 목록 밑에 펼쳐짐 */}
      <section ref={detailRef} className="rounded-2xl border border-white/10 bg-surface">
        {!detail ? (
          <p className="px-4 py-16 text-center text-sm text-fg-muted">목록에서 공지를 선택해주세요.</p>
        ) : (
          <div className="animate-page-in px-4 py-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {detail.pinned && <PinBadge />}
                  <h2 className="min-w-0 text-lg font-bold leading-snug">{detail.title}</h2>
                </div>
                <p className="mt-1 text-[11px] text-fg-muted">
                  {authorLabel(detail.authorId)} · {fmtDate(detail.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => setDetailId(null)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 whitespace-pre-wrap border-t border-white/8 pt-4 text-[13px] leading-relaxed">{detail.body}</p>

            {/* 이모지 반응 */}
            <div className="relative mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
              {reactionsOf(detail).map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => react(detail.id, r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                    r.mine ? "border-primary/60 bg-primary/15" : "border-white/10 bg-surface-2"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className={r.mine ? "font-bold text-primary-bright" : "text-fg-muted"}>{r.count}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                aria-label="반응 남기기"
                className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${
                  pickerOpen ? "border-primary/60 bg-primary/15 text-primary-bright" : "border-white/10 bg-surface-2 text-fg-muted"
                }`}
              >
                <SmilePlusIcon className="h-4 w-4" />
              </button>

              {pickerOpen && (
                <>
                  <button type="button" aria-label="닫기" onClick={() => setPickerOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-0.5 rounded-full border border-white/12 bg-surface-2 px-1.5 py-1 shadow-2xl">
                    {QUICK_EMOJI.map((e) => (
                      <button key={e} type="button" onClick={() => react(detail.id, e)} className="grid h-8 w-8 place-items-center rounded-full text-lg">
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 공지 작성 모달 (관리자) */}
      {writeOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setWriteOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />

          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">공지 작성</p>
              <button type="button" onClick={() => setWriteOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>제목</p>
                <input autoFocus value={wTitle} onChange={(e) => setWTitle(e.target.value)} placeholder="공지 제목을 입력하세요" className={fieldCls} />
              </div>

              <div>
                <p className={labelCls}>내용</p>
                <textarea
                  value={wContent}
                  onChange={(e) => setWContent(e.target.value)}
                  rows={7}
                  placeholder="전 직원에게 전달할 내용을 적어주세요"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              <button
                type="button"
                onClick={() => setWPin((v) => !v)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  wPin ? "border-primary/60 bg-primary/12" : "border-white/10"
                }`}
              >
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border ${wPin ? "border-primary bg-primary text-white" : "border-white/25"}`}>
                  {wPin && <BoltIcon className="h-2.5 w-2.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${wPin ? "text-primary-bright" : ""}`}>상단 고정</p>
                  <p className="text-[11px] text-fg-muted">목록 맨 위에 고정으로 노출됩니다</p>
                </div>
              </button>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setWriteOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitWrite} disabled={!wTitle.trim() || !wContent.trim() || posting} className="btn-primary flex-[2] py-2.5 text-sm">
                {posting ? "등록 중…" : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
