"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useNavTargetFor } from "@/hooks/nav-target";
import { assetUrl } from "@/lib/api/client";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  listDocuments,
  listFolders,
  updateDocument,
  updateFolder,
  uploadDocument,
  type DocumentDTO,
  type FolderDTO,
} from "@/lib/api/hifis";

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

type Folder = { id: string; name: string; scope: string; space: string; parent: string | null };
type Doc = {
  id: string;
  name: string;
  ext: string; // 표시 라벨 (대문자, 이미지는 IMG)
  size: string;
  scope: string;
  space: string;
  parent: string | null;
  tags: string[];
  desc?: string;
  url: string; // 공개 서빙 경로
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

const IMG_EXTS = new Set(["PNG", "JPG", "JPEG", "GIF", "WEBP", "SVG", "HEIC", "BMP"]);
const extLabel = (ext: string) => {
  const up = (ext || "").replace(/^\./, "").toUpperCase();
  if (IMG_EXTS.has(up)) return "IMG";
  return up || "FILE";
};
function formatBytes(n: number): string {
  if (!n) return "0B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)}${u[i]}`;
}

function toFolder(f: FolderDTO): Folder {
  return { id: f.id, name: f.name, scope: f.scope, space: f.space, parent: f.parentId ?? null };
}
function toDoc(d: DocumentDTO): Doc {
  return {
    id: d.id,
    name: d.name,
    ext: extLabel(d.ext),
    size: formatBytes(d.sizeBytes),
    scope: d.scope,
    space: d.space,
    parent: d.folderId ?? null,
    tags: d.tags ?? [],
    desc: d.desc ?? undefined,
    url: d.url,
  };
}

// space(자유 문자열) → 색 점
const SPACE_DOTS = ["bg-sky-400", "bg-rose-400", "bg-violet-400", "bg-emerald-400", "bg-amber-400", "bg-cyan-400", "bg-pink-400"];
const spaceDot = (s: string) => {
  let h = 0;
  for (const c of s) h += c.charCodeAt(0);
  return SPACE_DOTS[h % SPACE_DOTS.length];
};

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Docs() {
  const { show } = useToast();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loaded, setLoaded] = useState(false);

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
  const [uFile, setUFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 새 폴더 모달
  const [fdOpen, setFdOpen] = useState(false);
  const [fdName, setFdName] = useState("");
  const [fdScope, setFdScope] = useState<Scope>("전체 공개");

  // 이름 변경 모달
  const [renaming, setRenaming] = useState<{ kind: "folder" | "doc"; id: string; name: string } | null>(null);

  const load = useCallback(() => {
    Promise.all([listFolders(), listDocuments()])
      .then(([fs, ds]) => {
        setFolders(fs.map(toFolder));
        setDocs(ds.map(toDoc));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
  const match = (name: string, sc: string, sp: string) =>
    (space === "all" || sp === space) && (tab === "전체" || sc === tab) && (q === "" || name.includes(q));

  // 검색 중에는 폴더 구분 없이 전체에서 찾음
  const inCwd = (parent: string | null) => (q !== "" ? true : parent === cwd);

  const shownFolders = folders.filter((f) => inCwd(f.parent) && match(f.name, f.scope, f.space));
  const shownDocs = docs.filter((d) => inCwd(d.parent) && match(d.name, d.scope, d.space));

  const cwdFolder = cwd ? folders.find((f) => f.id === cwd) ?? null : null;

  // 문서함(space) 칩 — 데이터에서 동적 생성
  const distinctSpaces = Array.from(new Set([...folders.map((f) => f.space), ...docs.map((d) => d.space)])).filter(Boolean).sort();
  const targetSpace = space === "all" ? "일반" : space; // 업로드/폴더 생성 대상

  /* 액션 */
  const docDownload = (d: Doc) => {
    if (typeof window !== "undefined") window.open(assetUrl(d.url), "_blank", "noopener");
    show(`${d.name} 다운로드를 시작했습니다`);
  };
  const docShare = (d: Doc) => {
    navigator.clipboard?.writeText(assetUrl(d.url)).catch(() => {});
    show(`${d.name} 공유 링크를 복사했습니다`);
  };
  const removeFolder = async (id: string, name: string) => {
    try {
      await deleteFolder(id);
      setFolders((l) => l.filter((f) => f.id !== id));
      setDocs((l) => l.filter((d) => d.parent !== id));
      if (cwd === id) setCwd(null);
      show(`${name} 폴더를 삭제했습니다`, "cancel");
    } catch {
      show("폴더 삭제에 실패했어요", "cancel");
    }
  };
  const removeDoc = async (id: string, name: string) => {
    try {
      await deleteDocument(id);
      setDocs((l) => l.filter((d) => d.id !== id));
      show(`${name} 문서를 삭제했습니다`, "cancel");
    } catch {
      show("문서 삭제에 실패했어요", "cancel");
    }
  };
  const submitRename = async () => {
    if (!renaming) return;
    const n = renaming.name.trim();
    if (!n) return;
    const { kind, id } = renaming;
    try {
      if (kind === "folder") {
        await updateFolder(id, { name: n });
        setFolders((l) => l.map((f) => (f.id === id ? { ...f, name: n } : f)));
      } else {
        await updateDocument(id, { name: n });
        setDocs((l) => l.map((d) => (d.id === id ? { ...d, name: n } : d)));
      }
      setRenaming(null);
      show("이름을 변경했습니다");
    } catch {
      show("이름 변경에 실패했어요", "cancel");
    }
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
    setUFile(f);
    if (!uName.trim()) setUName(f.name.replace(/\.[^.]+$/, ""));
  };
  const submitUpload = async () => {
    if (!uFile || uploading) return;
    const form = new FormData();
    form.append("file", uFile);
    form.append("scope", uScope);
    form.append("space", targetSpace);
    if (cwd) form.append("folderId", cwd);
    const nm = uName.trim();
    if (nm) form.append("name", nm);
    if (uDesc.trim()) form.append("desc", uDesc.trim());
    if (uTags.trim()) form.append("tags", uTags.trim());
    setUploading(true);
    try {
      const created = await uploadDocument(form);
      setDocs((l) => [toDoc(created), ...l]);
      setUpOpen(false);
      show(`${created.name} 문서를 등록했습니다`);
    } catch {
      show("문서 업로드에 실패했어요", "cancel");
    } finally {
      setUploading(false);
    }
  };

  const openFolderModal = () => {
    setFdName("");
    setFdScope("전체 공개");
    setFdOpen(true);
  };
  const submitFolder = async () => {
    const n = fdName.trim();
    if (!n) return;
    try {
      const created = await createFolder({ name: n, scope: fdScope, space: targetSpace, parentId: cwd ?? undefined });
      setFolders((l) => [toFolder(created), ...l]);
      setFdOpen(false);
      show(`${n} 폴더를 만들었습니다`);
    } catch {
      show("폴더 생성에 실패했어요", "cancel");
    }
  };

  type RowAction = { k: string; Icon: (p: { className?: string }) => React.ReactElement; fn: () => void; label: string; cls: string };
  const RowActions = ({ onDl, onSh, onEd, onRm }: { onDl?: () => void; onSh?: () => void; onEd: () => void; onRm: () => void }) => {
    const items: RowAction[] = [
      ...(onDl ? [{ k: "dl", Icon: DownloadIcon, fn: onDl, label: "다운로드", cls: "text-fg-muted" }] : []),
      ...(onSh ? [{ k: "sh", Icon: ShareIcon, fn: onSh, label: "공유", cls: "text-fg-muted" }] : []),
      { k: "ed", Icon: PencilIcon, fn: onEd, label: "이름 변경", cls: "text-fg-muted" },
      { k: "rm", Icon: TrashIcon, fn: onRm, label: "삭제", cls: "text-red-400" },
    ];
    return (
      <div className="flex shrink-0 items-center rounded-lg border border-white/10">
        {items.map(({ k, Icon, fn, label, cls }) => (
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
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
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

      {/* 문서함 구분 칩 (동적) */}
      <div className="flex flex-wrap gap-1.5">
        {[{ key: "all", label: "전체 문서함" }, ...distinctSpaces.map((s) => ({ key: s, label: s }))].map((s) => {
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
              {s.key !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${spaceDot(s.key)}`} />}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* 공개 범위 탭 — flex-1 균등 분배 */}
      <div className="flex border-b border-white/10">
        {(["전체", ...SCOPES] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative flex-1 pb-2 text-center text-[13px] transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
            >
              {t}
              {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* 경로 + 검색 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm">
          <button type="button" onClick={() => setCwd(null)} className={`flex items-center gap-1.5 ${cwd ? "text-fg-muted" : "font-bold text-fg"}`}>
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
      {loaded && shownFolders.length > 0 && (
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
                  <p className="text-[11px] text-fg-muted">{f.scope}</p>
                </div>
                <RowActions onEd={() => setRenaming({ kind: "folder", id: f.id, name: f.name })} onRm={() => removeFolder(f.id, f.name)} />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 문서 */}
      {loaded && (
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
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${extStyle(d.ext)}`}>{d.ext}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{d.name}</p>
                    <p className="text-[11px] text-fg-muted tabular-nums">
                      {d.scope} · {d.size}
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
                    onDl={() => docDownload(d)}
                    onSh={() => docShare(d)}
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
                <span className="text-[13px] font-bold">{uFile?.name ?? "파일 선택"}</span>
                <span className="text-[11px] text-fg-muted">{uFile ? formatBytes(uFile.size) : "업로드할 파일을 선택하세요"}</span>
              </button>
              <input ref={fileRef} type="file" onChange={onPickFile} className="hidden" />

              <p className="text-[11px] text-fg-muted">
                이 문서함에 저장: <b className="text-fg">{targetSpace}</b>
                {cwdFolder && <> · 폴더 {cwdFolder.name}</>}
              </p>

              <div>
                <p className={labelCls}>제목 <span className="font-normal text-fg-muted">(비우면 파일명)</span></p>
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
              <button type="button" onClick={submitUpload} disabled={!uFile || uploading} className="btn-primary flex-[2] py-2.5 text-sm">
                {uploading ? "업로드 중…" : "등록"}
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
              <p className="text-[11px] text-fg-muted">
                이 문서함에 생성: <b className="text-fg">{targetSpace}</b>
                {cwdFolder && <> · 상위 {cwdFolder.name}</>}
              </p>
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
