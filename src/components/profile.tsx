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

// 업무 상태 (조직도·사내톡 등에 보여지는 상태)
const WORK_STATUSES = [
  { key: "auto", emoji: "🔄", label: "자동 (출근 기준)", short: "자동" },
  { key: "meeting", emoji: "💼", label: "회의중", short: "회의중" },
  { key: "meal", emoji: "🍽️", label: "식사", short: "식사" },
  { key: "out", emoji: "🚶", label: "외출", short: "외출" },
  { key: "away", emoji: "💤", label: "자리비움", short: "자리비움" },
];

// 공통 타이포 (레퍼런스처럼 컴팩트하게)
const labelCls = "block text-[11px] font-semibold text-fg-muted";
const inputCls = "w-full rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-[13px] outline-none focus:border-primary/50";
const readonlyCls = "w-full cursor-not-allowed rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] text-fg-muted outline-none";
const helpCls = "mt-2 text-[11px] leading-relaxed text-fg-muted";
const sectionCls = "rounded-2xl border border-white/10 bg-surface p-4";
const h2Cls = "text-sm font-bold";

function Avatar({ color, initial, image }: { color: string; initial: string; image: string | null }) {
  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full text-lg font-bold text-white"
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
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold">{value}</p>
    </div>
  );
}

export function Profile() {
  // 프로필 표시/편집
  const [saved, setSaved] = useState({ name: DEFAULT_NAME, color: DEFAULT_COLOR, image: null as string | null });
  const [name, setName] = useState(saved.name);
  const [color, setColor] = useState(saved.color);
  const [image, setImage] = useState<string | null>(saved.image);
  const fileRef = useRef<HTMLInputElement>(null);

  // 업무 상태
  const [workStatus, setWorkStatus] = useState("auto");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);

  // 비밀번호 변경
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = name !== saved.name || color !== saved.color || image !== saved.image;
  const initial = (name.trim() || "?").charAt(0);
  const currentStatus = WORK_STATUSES.find((s) => s.key === workStatus)!;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImage(URL.createObjectURL(f));
  };
  const onSave = () => setSaved({ name, color, image });

  const changePw = () => {
    if (!pwCur) return setPwMsg({ ok: false, text: "현재 비밀번호를 입력하세요." });
    if (pwNew.length < 8) return setPwMsg({ ok: false, text: "새 비밀번호는 8자 이상이어야 해요." });
    if (pwNew !== pwConfirm) return setPwMsg({ ok: false, text: "새 비밀번호가 일치하지 않아요." });
    setPwMsg({ ok: true, text: "비밀번호가 변경되었어요." });
    setPwCur("");
    setPwNew("");
    setPwConfirm("");
  };

  return (
    <div className="space-y-2.5 px-4 pb-10 pt-5">
      {/* 헤딩 */}
      <div>
        <p className="text-[11px] font-medium text-fg-muted">계정</p>
        <h1 className="mt-0.5 text-xl font-bold">내 프로필</h1>
      </div>

      {/* 요약 카드 */}
      <section className={sectionCls}>
        <div className="flex items-center gap-3">
          <Avatar color={saved.color} initial={(saved.name.trim() || "?").charAt(0)} image={saved.image} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{saved.name}</p>
            <p className="truncate text-[13px] text-fg-muted">{PROFILE.email}</p>
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
      <section className={sectionCls}>
        <h2 className={h2Cls}>기본 정보</h2>

        <label className={`mt-4 ${labelCls}`}>이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" className={`mt-1.5 ${inputCls}`} />

        <label className={`mt-4 ${labelCls}`}>프로필 이미지</label>
        <div className="mt-1.5 flex items-center gap-3">
          <Avatar color={color} initial={initial} image={image} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 bg-surface-2 px-3 py-2 text-[13px] font-semibold text-fg"
          >
            이미지 업로드
          </button>
          {image && (
            <button type="button" onClick={() => setImage(null)} className="text-[11px] font-medium text-fg-muted">
              제거
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        <p className={helpCls}>이미지가 없을 땐 아래 아바타 색과 이름 첫 글자로 표시됩니다. (10MB 이하)</p>

        <label className={`mt-4 ${labelCls}`}>아바타 색</label>
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

        <label className={`mt-4 ${labelCls}`}>이메일</label>
        <input value={PROFILE.email} readOnly className={`mt-1.5 ${readonlyCls}`} />
        <p className={helpCls}>이메일은 관리자만 변경할 수 있습니다.</p>

        <label className={`mt-4 ${labelCls}`}>사번</label>
        <input value={PROFILE.empNo} readOnly className={`mt-1.5 ${readonlyCls}`} />
        <p className={helpCls}>가입 시 자동으로 부여됩니다.</p>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty}
            className="rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            저장
          </button>
        </div>
      </section>

      {/* 업무 상태 */}
      <section className={sectionCls}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={h2Cls}>업무 상태</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
              조직도·사내톡·팀원 목록에서 다른 사람들에게 보여지는 상태입니다.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted">
            {currentStatus.short}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {WORK_STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setWorkStatus(s.key)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                workStatus === s.key ? "bg-primary text-white" : "border border-white/10 bg-surface-2 text-fg"
              }`}
            >
              <span className="text-sm leading-none">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        <label className={`mt-4 ${labelCls}`}>상태 메시지 (선택)</label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            value={statusMsg}
            onChange={(e) => {
              setStatusMsg(e.target.value);
              setStatusSaved(false);
            }}
            placeholder="예) 14시까지 외근"
            className={`flex-1 ${inputCls}`}
          />
          <button
            type="button"
            onClick={() => setStatusSaved(true)}
            className="shrink-0 rounded-lg border border-white/15 bg-surface-2 px-3 py-2.5 text-[13px] font-semibold text-fg"
          >
            저장
          </button>
        </div>
        {statusSaved && <p className="mt-1.5 text-[11px] text-primary-bright">상태 메시지가 저장되었어요.</p>}
        <p className={helpCls}>
          &quot;근무중&quot; · &quot;오프라인&quot; 은 자동 판정이라 여기서 선택할 수 없어요. &quot;자동&quot; 을 선택하면 오늘
          출퇴근 여부에 따라 자동으로 표시됩니다.
        </p>
      </section>

      {/* 비밀번호 변경 */}
      <section className={sectionCls}>
        <h2 className={h2Cls}>비밀번호 변경</h2>

        <label className={`mt-4 ${labelCls}`}>현재 비밀번호</label>
        <input type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} className={`mt-1.5 ${inputCls}`} />

        <label className={`mt-4 ${labelCls}`}>새 비밀번호 (8자 이상)</label>
        <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className={`mt-1.5 ${inputCls}`} />

        <label className={`mt-4 ${labelCls}`}>새 비밀번호 확인</label>
        <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className={`mt-1.5 ${inputCls}`} />

        {pwMsg && <p className={`mt-3 text-[11px] ${pwMsg.ok ? "text-emerald-300" : "text-red-400"}`}>{pwMsg.text}</p>}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={changePw}
            className="rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            비밀번호 변경
          </button>
        </div>
      </section>

      {/* 회원 탈퇴 */}
      <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.03] p-4">
        <h2 className="text-sm font-bold text-red-400">회원 탈퇴</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
          탈퇴하면 이름·연락처 등 개인 식별 정보와 로그인 수단이 삭제되고 계정이 비활성화돼요. 회사가 법적으로 보관해야
          하는 근태·급여 기록은 익명 처리되어 일정 기간 보존될 수 있어요.
        </p>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-fg">
          관리자는 회사에 다른 관리자가 있어야 탈퇴할 수 있어요.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-red-500/40 px-4 py-2.5 text-[13px] font-semibold text-red-400"
        >
          회원 탈퇴하기
        </button>
      </section>
    </div>
  );
}
