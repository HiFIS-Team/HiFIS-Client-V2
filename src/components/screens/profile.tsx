"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { ApiError } from "@/lib/api/client";
import { changeMyPassword, updateMe } from "@/lib/api/hifis";

/**
 * 내 프로필 — **백엔드 연동**.
 * 요약/편집은 `useAuth().user`(EmployeeOut) + `PATCH /employees/me`(이름·아바타색·상태·상태메시지),
 * 비밀번호는 `POST /employees/me/password`. 저장 성공 시 `updateUser`로 로컬 즉시 반영.
 * ⚠️ 아바타 **사진 업로드**는 백엔드 업로드 엔드포인트가 없어 로컬 미리보기만(색은 저장됨).
 * ⚠️ **회원 탈퇴**는 셀프 삭제 엔드포인트가 없어 자리표시자.
 */

const DEFAULT_COLOR = "#9d3bfc";

const RANK_KO: Record<string, string> = {
  JUNIOR_TRAINER: "주니어 트레이너",
  PRO_TRAINER: "프로 트레이너",
  PRO1_TRAINER: "프로1 트레이너",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  FC: "FC",
};
const ROLE_KO: Record<string, string> = { ADMIN: "대표/관리자", MANAGER: "매니저", MEMBER: "일반 직원" };

// 아바타 색 팔레트
const COLORS = [
  "#3b82f6", "#2563eb", "#6366f1", "#0ea5e9", "#06b6d4", "#14b8a6", "#22c55e", "#84cc16",
  "#d97706", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#d946ef", "#9d3bfc", "#8b5cf6",
  "#64748b", "#94a3b8",
];

// 업무 상태 (key = 백엔드 WorkStatus enum)
const WORK_STATUSES = [
  { key: "AUTO", emoji: "🔄", label: "자동 (출근 기준)", short: "자동" },
  { key: "MEETING", emoji: "💼", label: "회의중", short: "회의중" },
  { key: "MEAL", emoji: "🍽️", label: "식사", short: "식사" },
  { key: "OUT", emoji: "🚶", label: "외출", short: "외출" },
  { key: "AWAY", emoji: "💤", label: "자리비움", short: "자리비움" },
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
  const { show } = useToast();
  const { user, updateUser } = useAuth();

  // 편집 드래프트 (요약은 user 에서 직접 읽음)
  const [name, setName] = useState(user?.name ?? "");
  const [color, setColor] = useState(user?.avatarColor ?? DEFAULT_COLOR);
  const [image, setImage] = useState<string | null>(null); // 로컬 미리보기 (백엔드 업로드 없음)
  const fileRef = useRef<HTMLInputElement>(null);
  const [savingBasic, setSavingBasic] = useState(false);

  // 업무 상태
  const [workStatus, setWorkStatus] = useState(user?.workStatus ?? "AUTO");
  const [statusMsg, setStatusMsg] = useState(user?.statusMessage ?? "");
  const [savingStatus, setSavingStatus] = useState(false);

  // 비밀번호 변경
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  if (!user) return null; // 라우트 게이트가 authed 를 보장하지만 방어

  const dirty = name.trim() !== "" && (name !== user.name || color !== user.avatarColor);
  const initial = (name.trim() || "?").charAt(0);
  const currentStatus = WORK_STATUSES.find((s) => s.key === workStatus) ?? WORK_STATUSES[0];

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setImage(URL.createObjectURL(f));
  };

  const onSaveBasic = async () => {
    const n = name.trim();
    if (!n || !dirty || savingBasic) return;
    setSavingBasic(true);
    try {
      await updateMe({ name: n, avatarColor: color });
      updateUser({ name: n, avatarColor: color });
      show("프로필을 저장했습니다");
    } catch {
      show("저장에 실패했어요", "cancel");
    } finally {
      setSavingBasic(false);
    }
  };

  const onPickStatus = async (key: string) => {
    if (key === workStatus) return;
    const prev = workStatus;
    setWorkStatus(key);
    try {
      await updateMe({ workStatus: key });
      updateUser({ workStatus: key });
    } catch {
      setWorkStatus(prev); // 롤백
      show("상태 변경에 실패했어요", "cancel");
    }
  };

  const onSaveStatusMsg = async () => {
    if (savingStatus) return;
    setSavingStatus(true);
    const msg = statusMsg.trim() || null;
    try {
      await updateMe({ statusMessage: msg });
      updateUser({ statusMessage: msg });
      show("상태 메시지를 저장했습니다");
    } catch {
      show("저장에 실패했어요", "cancel");
    } finally {
      setSavingStatus(false);
    }
  };

  const changePw = async () => {
    setPwMsg(null);
    if (!pwCur) return setPwMsg({ ok: false, text: "현재 비밀번호를 입력하세요." });
    if (pwNew.length < 8) return setPwMsg({ ok: false, text: "새 비밀번호는 8자 이상이어야 해요." });
    if (pwNew !== pwConfirm) return setPwMsg({ ok: false, text: "새 비밀번호가 일치하지 않아요." });
    setPwBusy(true);
    try {
      await changeMyPassword({ currentPassword: pwCur, newPassword: pwNew });
      setPwMsg({ ok: true, text: "비밀번호가 변경되었어요." });
      show("비밀번호를 변경했습니다");
      setPwCur("");
      setPwNew("");
      setPwConfirm("");
    } catch (e) {
      const text = e instanceof ApiError && e.code === "INVALID_PASSWORD" ? "현재 비밀번호가 올바르지 않아요." : "변경에 실패했어요.";
      setPwMsg({ ok: false, text });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-10 pt-5">
      {/* 헤딩 */}
      <div>
        <h1 className="text-xl font-bold">내 프로필</h1>
      </div>

      {/* 요약 카드 */}
      <section className={sectionCls}>
        <div className="flex items-center gap-3">
          <Avatar color={user.avatarColor} initial={(user.name.trim() || "?").charAt(0)} image={user.avatarUrl ?? null} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{user.name}</p>
            <p className="truncate text-[13px] text-fg-muted">{user.email}</p>
          </div>
        </div>
        <div className="my-4 border-t border-white/10" />
        <div className="grid grid-cols-2 gap-y-4">
          <SummaryField label="사번" value={user.barcode ?? "—"} />
          <SummaryField label="직급" value={RANK_KO[user.rank] ?? user.rank} />
          <SummaryField label="팀" value={user.team ?? "—"} />
          <SummaryField label="권한" value={ROLE_KO[user.role] ?? user.role} />
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
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary px-3 py-2 text-[13px]">
            이미지 업로드
          </button>
          {image && (
            <button type="button" onClick={() => setImage(null)} className="text-[11px] font-medium text-fg-muted">
              제거
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        </div>
        <p className={helpCls}>사진 업로드는 준비 중이라 지금은 미리보기만 돼요. 아바타 색과 이름 첫 글자로 표시됩니다.</p>

        <label className={`mt-4 ${labelCls}`}>아바타 색</label>
        <div className="mt-2 grid grid-cols-8 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`아바타 색 ${c}`}
              className={`aspect-square rounded-lg transition ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-surface" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <label className={`mt-4 ${labelCls}`}>이메일</label>
        <input value={user.email} readOnly className={`mt-1.5 ${readonlyCls}`} />
        <p className={helpCls}>이메일은 관리자만 변경할 수 있습니다.</p>

        <label className={`mt-4 ${labelCls}`}>사번</label>
        <input value={user.barcode ?? "—"} readOnly className={`mt-1.5 ${readonlyCls}`} />
        <p className={helpCls}>가입 시 자동으로 부여됩니다.</p>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={onSaveBasic} disabled={!dirty || savingBasic} className="btn-primary px-5 py-2.5 text-[13px]">
            {savingBasic ? "저장 중…" : "저장"}
          </button>
        </div>
      </section>

      {/* 업무 상태 */}
      <section className={sectionCls}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={h2Cls}>업무 상태</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">조직도·사내톡·팀원 목록에서 다른 사람들에게 보여지는 상태입니다.</p>
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
              onClick={() => onPickStatus(s.key)}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs ${workStatus === s.key ? "btn-primary" : "btn-secondary"}`}
            >
              <span className="text-[13px] leading-none">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>

        <label className={`mt-4 ${labelCls}`}>상태 메시지 (선택)</label>
        <div className="mt-1.5 flex items-center gap-2">
          <input value={statusMsg} onChange={(e) => setStatusMsg(e.target.value)} placeholder="예) 14시까지 외근" className={`flex-1 ${inputCls}`} />
          <button type="button" onClick={onSaveStatusMsg} disabled={savingStatus} className="btn-secondary shrink-0 px-3 py-2.5 text-[13px]">
            {savingStatus ? "저장 중…" : "저장"}
          </button>
        </div>
        <p className={helpCls}>
          &quot;근무중&quot; · &quot;오프라인&quot; 은 자동 판정이라 여기서 선택할 수 없어요. &quot;자동&quot; 을 선택하면 오늘 출퇴근 여부에 따라 자동으로 표시됩니다.
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
          <button type="button" onClick={changePw} disabled={pwBusy} className="btn-primary px-5 py-2.5 text-[13px]">
            {pwBusy ? "변경 중…" : "비밀번호 변경"}
          </button>
        </div>
      </section>

      {/* 회원 탈퇴 */}
      <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.03] p-4">
        <h2 className="text-sm font-bold text-red-400">회원 탈퇴</h2>
        <p className="mt-2 text-[11px] leading-relaxed text-fg-muted">
          탈퇴하면 이름·연락처 등 개인 식별 정보와 로그인 수단이 삭제되고 계정이 비활성화돼요. 회사가 법적으로 보관해야 하는 근태·급여 기록은 익명 처리되어 일정 기간 보존될 수 있어요.
        </p>
        <p className="mt-2 text-[11px] font-semibold leading-relaxed text-fg">관리자는 회사에 다른 관리자가 있어야 탈퇴할 수 있어요.</p>
        <button type="button" onClick={() => show("회원 탈퇴는 준비 중이에요", "cancel")} className="btn-danger mt-3 px-4 py-2.5 text-[13px]">
          회원 탈퇴하기
        </button>
      </section>
    </div>
  );
}
