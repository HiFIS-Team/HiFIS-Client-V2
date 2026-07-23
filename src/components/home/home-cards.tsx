"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/providers/projects-store";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { listNotices, type NoticeDTO } from "@/lib/api/hifis";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
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

function CardHeader({ title, count, onMore }: { title: string; count: number; onMore: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
      <p className="text-sm font-bold">
        {title} <span className="ml-0.5 text-xs font-semibold text-fg-muted">{count}</span>
      </p>
      <button
        type="button"
        onClick={onMore}
        className="flex items-center gap-1 text-xs font-semibold text-fg-muted transition hover:text-fg"
      >
        전체
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── 오늘의 업무 ───────────────────────────────── */
// D-day → 뱃지 문구 + 색 + 좌측 바 색 (마감 임박일수록 빨강)
function ddayInfo(dday: number): { text: string; tagCls: string; bar: string } {
  if (dday < 0) return { text: `D+${-dday}`, tagCls: "bg-red-500/12 text-red-400", bar: "bg-red-400" };
  if (dday === 0) return { text: "D-DAY", tagCls: "bg-red-500/12 text-red-400", bar: "bg-red-400" };
  if (dday <= 3) return { text: `D-${dday}`, tagCls: "bg-red-500/12 text-red-400", bar: "bg-red-400" };
  if (dday <= 7) return { text: `D-${dday}`, tagCls: "bg-amber-400/12 text-amber-300", bar: "bg-amber-400" };
  return { text: `D-${dday}`, tagCls: "bg-primary/15 text-primary-bright", bar: "bg-primary" };
}

type Row = { key: string; emoji: string; title: string; bar: string; tag: string; tagCls: string; href: string };

export function TodayTasks() {
  const router = useRouter();
  const { projects } = useProjects();

  // 첫 줄 = 환경정비(반복), 그 밑에 진행 중 프로젝트를 마감 임박순으로 쭉
  const rows: Row[] = [
    { key: "env", emoji: "🧺", title: "환경정비", bar: "bg-primary", tag: "반복", tagCls: "bg-primary/15 text-primary-bright", href: "/tasks" },
    ...projects
      .filter((p) => p.progress < 100)
      .sort((a, b) => a.dday - b.dday)
      .map((p) => {
        const d = ddayInfo(p.dday);
        return { key: p.id, emoji: "📋", title: p.title, bar: d.bar, tag: d.text, tagCls: d.tagCls, href: "/projects" };
      }),
  ];
  const slots = Math.max(5, rows.length); // 최소 5칸 고정, 프로젝트 많으면 늘어남

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <CardHeader title="오늘의 업무" count={rows.length} onMore={() => router.push("/tasks")} />
      <div className="divide-y divide-white/5">
        {Array.from({ length: slots }).map((_, i) => {
          const t = rows[i];
          return t ? (
            <button key={t.key} type="button" onClick={() => router.push(t.href)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className={`h-8 w-1 shrink-0 rounded-full ${t.bar}`} />
              <span className="text-[15px] leading-none">{t.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.title}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.tagCls}`}>{t.tag}</span>
            </button>
          ) : (
            <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
              <span className="h-8 w-1 shrink-0 rounded-full bg-white/5" />
              <span className="h-2.5 w-28 rounded-full bg-white/5" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── 공지 (실 API 연동) ────────────────────────── */
const fmtShort = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}. ${d.getDate()}.`;
};

export function NoticesCard() {
  const router = useRouter();
  const { user } = useAuth();
  const nameOf = useEmployeeNames();
  const [notices, setNotices] = useState<NoticeDTO[]>([]);

  useEffect(() => {
    let alive = true;
    listNotices()
      .then((rows) => {
        if (alive) setNotices(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 고정 먼저, 그다음 최신순
  const sorted = [...notices].sort((a, b) => (a.pinned === b.pinned ? (a.createdAt < b.createdAt ? 1 : -1) : a.pinned ? -1 : 1));
  const authorLabel = (id: string) => (id === user?.id ? user?.name ?? "나" : nameOf(id, "관리자"));

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <CardHeader title="공지" count={notices.length} onMore={() => router.push("/notices")} />
      {notices.length === 0 ? (
        <p className="px-4 py-16 text-center text-sm text-fg-muted">등록된 공지가 없어요.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, i) => {
            const n = sorted[i];
            return n ? (
              <button key={n.id} type="button" onClick={() => router.push("/notices")} className="block w-full px-4 py-3 text-left">
                <div className="flex items-center gap-1.5">
                  {n.pinned && (
                    <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      <BoltIcon className="h-2.5 w-2.5" />
                      고정
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-bold">{n.title}</span>
                </div>
                <p className="mt-1 text-[11px] text-fg-muted">
                  {authorLabel(n.authorId)} · {fmtShort(n.createdAt)}
                </p>
              </button>
            ) : (
              <div key={`empty-${i}`} className="px-4 py-3" aria-hidden="true">
                <span className="block h-3 w-32 rounded-full bg-white/5" />
                <span className="mt-1.5 block h-2 w-20 rounded-full bg-white/[0.04]" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
