"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useNavTargetFor } from "@/hooks/nav-target";

/* ── 아이콘 ─────────────────────────────────────── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
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
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
      <path d="M5 19.5h14" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="17" cy="6" r="2.5" />
      <circle cx="7" cy="12" r="2.5" />
      <circle cx="17" cy="18" r="2.5" />
      <path d="m9.2 10.9 5.6-3.3M9.2 13.1l5.6 3.3" />
    </svg>
  );
}
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14M10 7V5h4v2" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
    </svg>
  );
}
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V8" />
      <path d="m8 11.5 4-4 4 4" />
    </svg>
  );
}
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h3.8l1.8 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" />
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

/* ── 모델 ───────────────────────────────────────── */
type Scope = "전체 공개" | "팀 공개" | "개인" | "사용자지정";
const SCOPES: Scope[] = ["전체 공개", "팀 공개", "개인", "사용자지정"];

// 문서함 구분 (레퍼런스의 워크스페이스 칩)
type Space = { key: string; label: string; dot: string };
const SPACES: Space[] = [
  { key: "all", label: "전체 문서함", dot: "" },
  { key: "gangnam", label: "강남점", dot: "bg-sky-400" },
  { key: "hq", label: "본사 공유", dot: "bg-rose-400" },
  { key: "edu", label: "교육 자료", dot: "bg-violet-400" },
];

type Folder = { id: string; name: string; offset: number; scope: Scope; space: string; parent: string | null };
type Doc = {
  id: string;
  name: string;
  ext: string;
  size: string;
  offset: number;
  scope: Scope;
  space: string;
  parent: string | null;
  tags: string[];
  desc?: string;
};

const EXT_STYLE: Record<string, string> = {
  PDF: "bg-rose-400/12 text-rose-300",
  XLSX: "bg-emerald-400/12 text-emerald-300",
  DOCX: "bg-sky-400/12 text-sky-300",
  PPTX: "bg-amber-400/12 text-amber-300",
  IMG: "bg-violet-400/12 text-violet-300",
  ZIP: "bg-slate-400/12 text-slate-300",
};
const extStyle = (e: string) => EXT_STYLE[e] ?? EXT_STYLE.ZIP;

const SEED_FOLDERS: Folder[] = [
  { id: "f1", name: "매장 운영", offset: -180, scope: "전체 공개", space: "gangnam", parent: null },
  { id: "f2", name: "교육 자료", offset: -120, scope: "팀 공개", space: "edu", parent: null },
  { id: "f3", name: "회원 관리 양식", offset: -90, scope: "팀 공개", space: "gangnam", parent: null },
  { id: "f4", name: "내 메모", offset: -30, scope: "개인", space: "gangnam", parent: null },
  { id: "f5", name: "청소 체크리스트", offset: -60, scope: "전체 공개", space: "gangnam", parent: "f1" },
];

const SEED_DOCS: Doc[] = [
  {
    id: "d1",
    name: "2026 근무 규정 v3",
    ext: "PDF",
    size: "1.2MB",
    offset: -14,
    scope: "전체 공개",
    space: "hq",
    parent: null,
    tags: ["규정", "인사"],
    desc: "2026년 개정 근무 규정 전문입니다.",
  },
  { id: "d2", name: "8월 근무표", ext: "XLSX", size: "48KB", offset: -3, scope: "팀 공개", space: "gangnam", parent: null, tags: ["근무표"] },
  { id: "d3", name: "신입 트레이너 온보딩 가이드", ext: "PDF", size: "3.4MB", offset: -40, scope: "팀 공개", space: "edu", parent: null, tags: ["교육", "온보딩"] },
  { id: "d4", name: "회원 상담 기록 양식", ext: "DOCX", size: "92KB", offset: -21, scope: "팀 공개", space: "gangnam", parent: null, tags: ["양식", "회원"] },
  { id: "d5", name: "안전 교육 자료", ext: "PPTX", size: "8.1MB", offset: -55, scope: "전체 공개", space: "edu", parent: null, tags: ["교육", "안전"] },
  { id: "d6", name: "장비 배치도", ext: "IMG", size: "2.6MB", offset: -70, scope: "전체 공개", space: "gangnam", parent: "f1", tags: ["시설"] },
  { id: "d7", name: "일일 청소 체크리스트", ext: "PDF", size: "210KB", offset: -60, scope: "전체 공개", space: "gangnam", parent: "f5", tags: ["청소"] },
];

/* ── 유틸 ───────────────────────────────────────── */
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d: Date) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Docs() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [folders, setFolders] = useState<Folder[]>(SEED_FOLDERS);
  const [docs, setDocs] = useState<Doc[]>(SEED_DOCS);

  const [space, setSpace] = useState("all");
  const [tab, setTab] = useState<"전체" | Scope>("전체");
  const nav = useNavTargetFor("/docs"); // 헤더 검색에서 넘어온 항목
  const [query, setQuery] = useState(nav?.q ?? "");
  const [cwd, setCwd] = useState<string | null>(null); // 현재 폴더 (null = 루트)

  // 업로드 모달
  const [upOpen, setUpOpen] = useState(false);
  const [uName, setUName] = useState("");
  const [uDesc, setUDesc] = useState("");
  const [uTags, setUTags] = useState("");
  const [uScope, setUScope] = useState<Scope>("전체 공개");
  const [uFile, setUFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 새 폴더 모달
  const [fdOpen, setFdOpen] = useState(false);
  const [fdName, setFdName] = useState("");
  const [fdScope, setFdScope] = useState<Scope>("전체 공개");

  // 이름 변경 모달
  const [renaming, setRenaming] = useState<{ kind: "folder" | "doc"; id: string; name: string } | null>(null);

  const idRef = useRef(0);

  useEffect(() => setToday(new Date()), []);

  useEffect(() => {
    if (!upOpen && !fdOpen && !renaming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (renaming) setRenaming(null);
      else if (upOpen) setUpOpen(false);
      else setFdOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [upOpen, fdOpen, renaming]);

  const q = query.trim();
  const match = (name: string, sc: Scope, sp: string) =>
    (space === "all" || sp === space) && (tab === "전체" || sc === tab) && (q === "" || name.includes(q));

  // 검색 중에는 폴더 구분 없이 전체에서 찾음
  const inCwd = (parent: string | null) => (q !== "" ? true : parent === cwd);

  const shownFolders = folders.filter((f) => inCwd(f.parent) && match(f.name, f.scope, f.space));
  const shownDocs = docs.filter((d) => inCwd(d.parent) && match(d.name, d.scope, d.space));

  const cwdFolder = cwd ? folders.find((f) => f.id === cwd) ?? null : null;

  /* 액션 */
  const download = (name: string) => show(`${name} 다운로드를 시작했습니다`);
  const share = (name: string) => {
    navigator.clipboard?.writeText(`https://hifis.app/docs/${encodeURIComponent(name)}`).catch(() => {});
    show(`${name} 공유 링크를 복사했습니다`);
  };
  const removeFolder = (id: string, name: string) => {
    setFolders((l) => l.filter((f) => f.id !== id));
    setDocs((l) => l.filter((d) => d.parent !== id));
    show(`${name} 폴더를 삭제했습니다`, "cancel");
  };
  const removeDoc = (id: string, name: string) => {
    setDocs((l) => l.filter((d) => d.id !== id));
    show(`${name} 문서를 삭제했습니다`, "cancel");
  };
  const submitRename = () => {
    if (!renaming) return;
    const n = renaming.name.trim();
    if (!n) return;
    if (renaming.kind === "folder") setFolders((l) => l.map((f) => (f.id === renaming.id ? { ...f, name: n } : f)));
    else setDocs((l) => l.map((d) => (d.id === renaming.id ? { ...d, name: n } : d)));
    setRenaming(null);
    show("이름을 변경했습니다");
  };

  const openUpload = () => {
    setUName("");
    setUDesc("");
    setUTags("");
    setUScope("전체 공개");
    setUFile(null);
    setUpOpen(true);
  };
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUFile(f.name);
    if (!uName.trim()) setUName(f.name.replace(/\.[^.]+$/, ""));
  };
  const submitUpload = () => {
    const n = uName.trim();
    if (!n) return;
    idRef.current += 1;
    const ext = (uFile?.split(".").pop() ?? "pdf").toUpperCase();
    setDocs((l) => [
      {
        id: `new-${idRef.current}`,
        name: n,
        ext: EXT_STYLE[ext] ? ext : "ZIP",
        size: "—",
        offset: 0,
        scope: uScope,
        space: space === "all" ? "gangnam" : space,
        parent: cwd,
        tags: uTags.split(",").map((t) => t.trim()).filter(Boolean),
        desc: uDesc.trim() || undefined,
      },
      ...l,
    ]);
    setUpOpen(false);
    show(`${n} 문서를 등록했습니다`);
  };

  const openFolderModal = () => {
    setFdName("");
    setFdScope("전체 공개");
    setFdOpen(true);
  };
  const submitFolder = () => {
    const n = fdName.trim();
    if (!n) return;
    idRef.current += 1;
    setFolders((l) => [
      { id: `nf-${idRef.current}`, name: n, offset: 0, scope: fdScope, space: space === "all" ? "gangnam" : space, parent: cwd },
      ...l,
    ]);
    setFdOpen(false);
    show(`${n} 폴더를 만들었습니다`);
  };

  const RowActions = ({ onDl, onSh, onEd, onRm }: { onDl: () => void; onSh: () => void; onEd: () => void; onRm: () => void }) => (
    <div className="flex shrink-0 items-center rounded-lg border border-white/10">
      {[
        { k: "dl", Icon: DownloadIcon, fn: onDl, label: "다운로드", cls: "text-fg-muted" },
        { k: "sh", Icon: ShareIcon, fn: onSh, label: "공유", cls: "text-fg-muted" },
        { k: "ed", Icon: PencilIcon, fn: onEd, label: "이름 변경", cls: "text-fg-muted" },
        { k: "rm", Icon: TrashIcon, fn: onRm, label: "삭제", cls: "text-red-400" },
      ].map(({ k, Icon, fn, label, cls }) => (
        <button
          key={k}
          type="button"
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation();
            fn();
          }}
          className={`grid h-8 w-8 place-items-center ${cls}`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
        <p className="text-xs font-semibold text-fg-muted">자료</p>
        <h1 className="text-xl font-bold">문서함</h1>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={openFolderModal} className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />
          새 폴더
        </button>
        <button type="button" onClick={openUpload} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />
          문서 업로드
        </button>
      </div>

      {/* 문서함 구분 칩 */}
      <div className="flex flex-wrap gap-1.5">
        {SPACES.map((s) => {
          const on = space === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setSpace(s.key);
                setCwd(null);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                on ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
              }`}
            >
              {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 공개 범위 탭 */}
      <div className="flex gap-4 border-b border-white/10">
        {(["전체", ...SCOPES] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px shrink-0 border-b-2 pb-2 text-[13px] transition-colors ${
                on ? "border-primary font-bold text-fg" : "border-transparent text-fg-muted"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* 경로 + 검색 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => setCwd(null)}
            className={`flex items-center gap-1.5 ${cwd ? "text-fg-muted" : "font-bold text-fg"}`}
          >
            <FolderIcon className="h-4 w-4 text-amber-300" />
            루트
          </button>
          {cwdFolder && (
            <>
              <ChevronRightIcon className="h-3.5 w-3.5 text-fg-muted" />
              <span className="min-w-0 truncate font-bold">{cwdFolder.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="문서 검색"
            className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-fg-muted"
          />
          {q !== "" && (
            <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="shrink-0 text-fg-muted">
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        {q !== "" && <p className="text-[11px] text-fg-muted">전체 문서함에서 검색 중</p>}
      </div>

      {/* 폴더 */}
      {shownFolders.length > 0 && today && (
        <section>
          <p className="px-1 pb-1.5 text-xs font-semibold text-fg-muted">폴더 {shownFolders.length}</p>
          <div className="space-y-1.5">
            {shownFolders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setCwd(f.id);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3 py-2.5 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-400/12">
                  <FolderIcon className="h-5 w-5 text-amber-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{f.name}</p>
                  <p className="text-[11px] text-fg-muted tabular-nums">{fmtDate(addDays(today, f.offset))}</p>
                </div>
                <RowActions
                  onDl={() => download(f.name)}
                  onSh={() => share(f.name)}
                  onEd={() => setRenaming({ kind: "folder", id: f.id, name: f.name })}
                  onRm={() => removeFolder(f.id, f.name)}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 문서 */}
      {today && (
        <section>
          <p className="px-1 pb-1.5 text-xs font-semibold text-fg-muted">문서 {shownDocs.length}</p>
          {shownDocs.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">
              {q !== "" ? `'${q}' 검색 결과가 없어요.` : "문서가 없어요. 위에서 업로드해보세요."}
            </p>
          ) : (
            <div className="space-y-1.5">
              {shownDocs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3 py-2.5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${extStyle(d.ext)}`}>
                    {d.ext}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{d.name}</p>
                    <p className="text-[11px] text-fg-muted tabular-nums">
                      {fmtDate(addDays(today, d.offset))} · {d.size}
                    </p>
                    {d.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {d.tags.map((t) => (
                          <span key={t} className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-fg-muted">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <RowActions
                    onDl={() => download(d.name)}
                    onSh={() => share(d.name)}
                    onEd={() => setRenaming({ kind: "doc", id: d.id, name: d.name })}
                    onRm={() => removeDoc(d.id, d.name)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 문서 업로드 모달 ───────────────────────── */}
      {upOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setUpOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">문서 업로드</p>
              <button type="button" onClick={() => setUpOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              {/* 파일 선택 */}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-6 transition-colors ${
                  uFile ? "border-primary/50 bg-primary/8" : "border-white/20"
                }`}
              >
                <UploadIcon className={`h-5 w-5 ${uFile ? "text-primary-bright" : "text-fg-muted"}`} />
                <span className="text-[13px] font-bold">{uFile ?? "파일 선택 (최대 2GB)"}</span>
                <span className="text-[11px] text-fg-muted">여러 개 선택 가능 · 링크만 있는 문서도 OK</span>
              </button>
              <input ref={fileRef} type="file" onChange={onPickFile} className="hidden" />

              <div>
                <p className={labelCls}>제목</p>
                <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="문서 제목" className={fieldCls} />
              </div>

              <div>
                <p className={labelCls}>설명</p>
                <textarea
                  value={uDesc}
                  onChange={(e) => setUDesc(e.target.value)}
                  rows={3}
                  placeholder="어떤 문서인지 간단히 적어주세요"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              <div>
                <p className={labelCls}>
                  태그 <span className="font-normal text-fg-muted">(쉼표로 구분)</span>
                </p>
                <input value={uTags} onChange={(e) => setUTags(e.target.value)} placeholder="예: 규정, 인사, 양식" className={fieldCls} />
              </div>

              <div>
                <p className={labelCls}>공개 범위</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setUScope(s)}
                      className={`rounded-lg border py-2.5 text-[13px] transition-colors ${
                        uScope === s ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setUpOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitUpload} disabled={!uName.trim()} className="btn-primary flex-[2] py-2.5 text-sm">
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 새 폴더 모달 ───────────────────────────── */}
      {fdOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setFdOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">새 폴더</p>
              <button type="button" onClick={() => setFdOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div>
                <p className={labelCls}>폴더 이름</p>
                <input autoFocus value={fdName} onChange={(e) => setFdName(e.target.value)} placeholder="예) 매장 운영" className={fieldCls} />
              </div>
              <div>
                <p className={labelCls}>공개 범위</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFdScope(s)}
                      className={`rounded-lg border py-2.5 text-[13px] transition-colors ${
                        fdScope === s ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setFdOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitFolder} disabled={!fdName.trim()} className="btn-primary flex-[2] py-2.5 text-sm">
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 이름 변경 모달 ─────────────────────────── */}
      {renaming && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setRenaming(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">이름 변경</p>
              <button type="button" onClick={() => setRenaming(null)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-4">
              <p className={labelCls}>{renaming.kind === "folder" ? "폴더 이름" : "문서 제목"}</p>
              <input
                autoFocus
                value={renaming.name}
                onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                // 한글 조합 중 Enter는 글자 확정이므로 제출로 치지 않는다
                onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submitRename()}
                className={fieldCls}
              />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setRenaming(null)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitRename} disabled={!renaming.name.trim()} className="btn-primary flex-[2] py-2.5 text-sm">
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
