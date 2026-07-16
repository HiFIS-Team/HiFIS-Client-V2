"use client";

import { useRef, useState } from "react";

// 목: 현재 사용자 (고정 정보)
const PROFILE = {
  email: "eunhoo@hifis.co.kr",
  empNo: "2024-0312",
  rank: "트레이너",
  team: "강남점",
  role: "일반 직원",
};

const DEFAULT_NAME = "김은후";
const DEFAULT_COLOR = "#9d3bfc";

// 아바타 색 팔레트
const COLORS = [
  "#3b82f6", "#2563eb", "#6366f1", "#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16",
  "#d97706", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#d946ef", "#9d3bfc", "#8b5cf6",
  "#64748b", "#94a3b8",
];

function Avatar({ color, initial, image }: { color: string; initial: string; image: string | null }) {
  return (
    <span
      className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-xl font-bold text-white"
      style={image ? undefined : { backgroundColor: color }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="프로필" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-fg-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

export function Profile() {
  // 저장된(표시용) 값
  const [saved, setSaved] = useState({ name: DEFAULT_NAME, color: DEFAULT_COLOR, image: null as string | null });
  // 편집 중(임시) 값
  const [name, setName] = useState(saved.name);
  const [color, setColor] = useState(saved.color);
  const [image, setImage] = useState<string | null>(saved.image);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name !== saved.name || color !== saved.color || image !== saved.image;
  const initial = (name.trim() || "?").charAt(0);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImage(URL.createObjectURL(f));
  };
  const onSave = () => setSaved({ name, color, image });

  return (
    <div className="space-y-2.5 px-4 pb-10 pt-5">
      {/* 헤딩 */}
      <div>
        <p className="text-xs font-medium text-fg-muted">계정</p>
        <h1 className="mt-0.5 text-2xl font-bold">내 프로필</h1>
      </div>

      {/* 요약 카드 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-center gap-3.5">
          <Avatar color={saved.color} initial={(saved.name.trim() || "?").charAt(0)} image={saved.image} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{saved.name}</p>
            <p className="truncate text-sm text-fg-muted">{PROFILE.email}</p>
          </div>
        </div>
        <div className="my-4 border-t border-white/10" />
        <div className="grid grid-cols-2 gap-y-4">
          <SummaryField label="사번" value={PROFILE.empNo} />
          <SummaryField label="직급" value={PROFILE.rank} />
          <SummaryField label="팀" value={PROFILE.team} />
          <SummaryField label="권한" value={PROFILE.role} />
        </div>
      </section>

      {/* 기본 정보 (편집) */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <h2 className="text-base font-bold">기본 정보</h2>

        {/* 이름 */}
        <label className="mt-4 block text-xs font-semibold text-fg-muted">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름"
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-sm outline-none focus:border-primary/50"
        />

        {/* 프로필 이미지 */}
        <label className="mt-4 block text-xs font-semibold text-fg-muted">프로필 이미지</label>
        <div className="mt-1.5 flex items-center gap-3">
          <Avatar color={color} initial={initial} image={image} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 bg-surface-2 px-3.5 py-2 text-sm font-semibold text-fg"
          >
            이미지 업로드
          </button>
          {image && (
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-xs font-medium text-fg-muted"
            >
              제거
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          이미지가 없을 땐 아래 아바타 색과 이름 첫 글자로 표시됩니다. (10MB 이하)
        </p>

        {/* 아바타 색 */}
        <label className="mt-4 block text-xs font-semibold text-fg-muted">아바타 색</label>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`아바타 색 ${c}`}
              className={`aspect-square rounded-lg transition ${
                color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* 이메일 (읽기 전용) */}
        <label className="mt-4 block text-xs font-semibold text-fg-muted">이메일</label>
        <input
          value={PROFILE.email}
          readOnly
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-sm text-fg-muted outline-none"
        />
        <p className="mt-2 text-xs text-fg-muted">이메일은 관리자만 변경할 수 있습니다.</p>

        {/* 사번 (읽기 전용) */}
        <label className="mt-4 block text-xs font-semibold text-fg-muted">사번</label>
        <input
          value={PROFILE.empNo}
          readOnly
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-sm text-fg-muted outline-none"
        />
        <p className="mt-2 text-xs text-fg-muted">가입 시 자동으로 부여됩니다.</p>
      </section>

      {/* 저장 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          저장
        </button>
      </div>
    </div>
  );
}
