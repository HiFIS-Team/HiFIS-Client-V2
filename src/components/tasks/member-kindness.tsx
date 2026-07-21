"use client";

import { useEffect, useState } from "react";

/**
 * 회원 친절도
 *
 * 회원이 매장에 배치된 QR(앱 밖, 프린트물)을 스캔해 설문을 작성한다.
 * 설문 항목: ①운동 시작 계기 ②칭찬하고 싶은 직원 ③피트니스스타가 보완하면 좋을 부분
 *            ④성함·연락처 ⑤개인정보 수집·이용 동의.
 * 이 탭은 그 **수신 응답이 쌓이는 목록**을 보여주고, 항목을 누르면 위 항목대로 상세를 본다(읽기 전용).
 * 칭찬하고 싶은 직원으로 지목되면 그 직원 +10점. ⚠️ 친절왕 랭킹은 여기 아님(별도 랭킹 페이지).
 * 지금은 목(백엔드 폼 수신 데이터로 교체).
 */

const SCORE_PER = 10; // 칭찬(직원 지목) 1건당 +10점
const ME = "은후"; // 현재 트레이너 (목)

// 전 항목 필수 → 모든 응답에 5개가 다 채워져 있다.
// (개인정보 동의도 필수 → 미동의는 제출 불가 → 수신된 응답은 전부 동의함·실명)
type Survey = {
  id: string;
  memberName: string; // 성함 (필수)
  contact: string; // 연락처 (필수)
  motive: string; // ① 운동 시작 계기 (필수)
  trainer: string; // ② 칭찬하고 싶은 직원 (필수)
  praise: string; // 그 직원 칭찬 내용
  improve: string; // ③ 피트니스스타가 보완하면 좋을 부분 (필수)
  consent: true; // ⑤ 개인정보 수집·이용 동의 (필수 → 항상 동의)
  offset: number; // 오늘 기준 일수 (0=오늘, 음수=과거)
  time: string; // HH:MM
};

// 수신된 설문 응답 (목) — 5항목 전부 채워짐
const SEED: Survey[] = [
  {
    id: "q1", memberName: "김서준", contact: "010-2345-1122", consent: true,
    motive: "체중 감량과 체력 관리를 위해 시작했어요.",
    trainer: "은후", praise: "항상 웃으면서 맞아주시고 운동 끝나고 스트레칭까지 챙겨주세요.",
    improve: "주차 공간이 조금 부족해요.",
    offset: 0, time: "10:30",
  },
  {
    id: "q2", memberName: "이서아", contact: "010-4471-9902", consent: true,
    motive: "친구 추천으로 시작하게 됐어요.",
    trainer: "지민", praise: "자세 교정을 꼼꼼하게 봐주셔서 좋았어요.",
    improve: "유산소 기구를 조금 더 늘려주세요.",
    offset: 0, time: "09:15",
  },
  {
    id: "q3", memberName: "이하은", contact: "010-8842-5501", consent: true,
    motive: "무릎 재활 목적으로 다니고 있어요.",
    trainer: "은후", praise: "PT 시간 잘 지켜주시고 친절하세요.",
    improve: "샤워실 수압이 조금 약해요.",
    offset: -1, time: "18:40",
  },
  {
    id: "q4", memberName: "강태오", contact: "010-6650-3321", consent: true,
    motive: "다이어트가 목표예요.",
    trainer: "현우", praise: "설명이 쉽고 친절해서 초보인데도 편했어요.",
    improve: "탈의실이 조금 좁게 느껴져요.",
    offset: -1, time: "14:05",
  },
  {
    id: "q5", memberName: "박민서", contact: "010-3390-7712", consent: true,
    motive: "체형 교정을 하고 싶어서요.",
    trainer: "서연", praise: "데스크 안내가 항상 친절해요.",
    improve: "정수기 옆에 종이컵이 자주 떨어져 있어요.",
    offset: -1, time: "12:20",
  },
  {
    id: "q6", memberName: "최지우", contact: "010-5567-2093", consent: true,
    motive: "건강 관리를 위해서요.",
    trainer: "서연", praise: "데스크에서 항상 반갑게 맞아주세요.",
    improve: "주말엔 사람이 많아서 예약제였으면 좋겠어요.",
    offset: -2, time: "11:10",
  },
  {
    id: "q7", memberName: "박지호", contact: "010-2211-8834", consent: true,
    motive: "근력 강화가 목표예요.",
    trainer: "은후", praise: "운동 힘들 때 긍정적으로 이끌어주셔서 감사해요.",
    improve: "수건을 조금 더 자주 채워주세요.",
    offset: -2, time: "20:00",
  },
  {
    id: "q8", memberName: "정유나", contact: "010-9080-1145", consent: true,
    motive: "스트레스 해소하려고요.",
    trainer: "민준", praise: "관장님이 직접 챙겨주셔서 든든해요.",
    improve: "주말 오픈 시간을 조금 앞당겨주세요.",
    offset: -3, time: "16:30",
  },
  {
    id: "q9", memberName: "한지훈", contact: "010-3312-7788", consent: true,
    motive: "체력 증진이 목적이에요.",
    trainer: "지민", praise: "긍정 에너지가 좋아서 수업이 즐거워요.",
    improve: "락커룸에 드라이기를 추가해주세요.",
    offset: -4, time: "13:45",
  },
  {
    id: "q10", memberName: "한서윤", contact: "010-7723-6640", consent: true,
    motive: "취미로 가볍게 운동하고 있어요.",
    trainer: "현우", praise: "초보에게도 친절하게 알려주세요.",
    improve: "락커 개수를 늘려주시면 좋겠어요.",
    offset: -5, time: "19:10",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");
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

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
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

// 상세 항목 (라벨 위 / 값 아래)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-2 p-3">
      <p className="mb-1 text-xs font-semibold text-fg-muted">{label}</p>
      {children}
    </div>
  );
}

export function MemberKindness() {
  // 회원이 채우는 데이터 → 여기선 읽기만 (setter 없음)
  const [surveys] = useState<Survey[]>(SEED);
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [detail, setDetail] = useState<Survey | null>(null);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const myCount = surveys.filter((s) => s.trainer === ME).length;
  const myScore = myCount * SCORE_PER;
  const shown = filter === "mine" ? surveys.filter((s) => s.trainer === ME) : surveys;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      {/* 이 화면이 뭔지 — 회원 QR 설문 응답 */}
      <p className="text-xs text-fg-muted">회원 QR 설문 응답 · 직원 칭찬 1건당 +{SCORE_PER}점</p>

      {/* 요약 (랭킹은 별도 페이지 → 여기선 내 점수·전체 응답만) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "받은 칭찬", value: `${myCount}건` },
          { label: "내 점수", value: `${myScore}점`, accent: true },
          { label: "전체 응답", value: `${surveys.length}건` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-surface px-3 py-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.accent ? "text-primary-bright" : ""}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 전체 / 내 칭찬 필터 */}
      <div className="flex rounded-lg border border-white/10 p-0.5">
        {[
          { key: "all", label: `전체 (${surveys.length})` },
          { key: "mine", label: `내 칭찬 (${myCount})` },
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

      {/* 설문 응답 목록 — 누르면 상세 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          설문 응답 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{shown.length}</span>
        </p>
        {shown.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">
            {filter === "mine" ? "아직 받은 칭찬이 없어요." : "아직 접수된 응답이 없어요."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {shown.map((s) => (
              <button key={s.id} type="button" onClick={() => setDetail(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: avatarColor(s.memberName) }}
                >
                  {s.memberName[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{s.memberName}</span>
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">
                      {s.trainer} 칭찬
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{s.praise}</span>
                  <span className="mt-0.5 block text-[11px] text-fg-muted/70">
                    {dayLabel(s.offset)} {ampm(s.time)}
                  </span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── 응답 상세 (설문 항목 그대로) ── */}
      {detail && (
        <div className="overlay-frame fixed inset-0 z-[80] flex items-center justify-center p-6">
          <button type="button" aria-label="닫기" onClick={() => setDetail(null)} className="absolute inset-0 bg-black/65" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/12 bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-bold">설문 응답</p>
              <button type="button" onClick={() => setDetail(null)} aria-label="닫기" className="text-fg-muted transition hover:text-fg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4">
              {/* 접수 시각 */}
              <p className="text-[11px] text-fg-muted">{dayLabel(detail.offset)} {ampm(detail.time)} 접수</p>

              {/* ① 운동 시작 계기 */}
              <Field label="운동 시작 계기">
                <p className="text-sm leading-snug">{detail.motive}</p>
              </Field>

              {/* ② 칭찬하고 싶은 직원 */}
              <Field label="칭찬하고 싶은 직원">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary-bright">{detail.trainer}</span>
                  {detail.trainer === ME && <span className="ml-auto text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}점</span>}
                </div>
                <p className="text-sm leading-snug">{detail.praise}</p>
              </Field>

              {/* ③ 피트니스스타가 보완하면 좋을 부분 */}
              <Field label="피트니스스타가 보완하면 좋을 부분">
                <p className="text-sm leading-snug">{detail.improve}</p>
              </Field>

              {/* ④ 성함 · 연락처 */}
              <Field label="성함 · 연락처">
                <p className="text-sm">
                  {detail.memberName}
                  <span className="ml-2 text-fg-muted tabular-nums">{detail.contact}</span>
                </p>
              </Field>

              {/* ⑤ 개인정보 수집·이용 동의 (필수 → 항상 동의함) */}
              <Field label="개인정보 수집·이용 동의">
                <span className="inline-block rounded-full bg-emerald-400/12 px-2 py-0.5 text-xs font-semibold text-emerald-300">동의함</span>
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
