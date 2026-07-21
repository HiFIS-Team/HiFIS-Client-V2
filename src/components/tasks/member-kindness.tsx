"use client";

import { useEffect, useState } from "react";

/**
 * 회원 친절도
 *
 * 회원이 매장에 배치된 QR(앱 밖, 프린트물)을 스캔해 설문을 작성한다.
 * 설문 = ①어느 트레이너가 친절했나(칭찬) + ②센터에 바라는 점.
 * 이 탭은 그 **수신 응답이 쌓이는 목록**을 보여주고, 항목을 누르면 상세를 본다(읽기 전용).
 * 칭찬 1건당 +10점. ⚠️ 친절왕 랭킹은 여기 아님 — 별도 랭킹 페이지에서 집계.
 * 지금은 목(백엔드 폼 수신 데이터로 교체).
 */

const SCORE_PER = 10; // 칭찬 1건당 +10점
const ME = "은후"; // 현재 트레이너 (목)

type Survey = {
  id: string;
  memberName?: string; // 응답 회원 (익명 가능)
  trainer?: string; // 칭찬한 트레이너 (센터 의견만 남기면 없음)
  praise?: string; // 칭찬 내용
  centerWish?: string; // 센터에 바라는 점
  offset: number; // 오늘 기준 일수 (0=오늘, 음수=과거)
  time: string; // HH:MM
};

// 수신된 설문 응답 (목) — 한 건이 칭찬·센터 의견을 함께 담을 수 있음
const SEED: Survey[] = [
  { id: "q1", memberName: "김서준", trainer: "은후", praise: "항상 웃으면서 맞아주시고 운동 끝나고 스트레칭까지 챙겨주세요. 덕분에 오는 게 즐거워요.", offset: 0, time: "10:30" },
  { id: "q2", trainer: "지민", praise: "자세 교정을 꼼꼼하게 봐주셔서 좋았어요.", offset: 0, time: "09:15" },
  { id: "q3", memberName: "이하은", trainer: "은후", praise: "PT 시간 잘 지켜주시고 친절하세요.", centerWish: "샤워실 수압이 조금 약해요.", offset: -1, time: "18:40" },
  { id: "q4", trainer: "현우", praise: "설명이 쉽고 친절해서 초보인데도 편했어요.", offset: -1, time: "14:05" },
  { id: "q5", centerWish: "정수기 옆에 종이컵이 자주 떨어져 있어요. 채워주시면 좋겠어요.", offset: -1, time: "12:20" },
  { id: "q6", memberName: "최지우", trainer: "서연", praise: "데스크에서 항상 반갑게 맞아주세요.", offset: -2, time: "11:10" },
  { id: "q7", memberName: "박지호", trainer: "은후", praise: "운동 힘들 때 긍정적으로 이끌어주셔서 감사해요.", centerWish: "수건을 조금 더 자주 채워주세요.", offset: -2, time: "20:00" },
  { id: "q8", memberName: "정유나", trainer: "민준", praise: "관장님이 직접 챙겨주셔서 든든해요.", centerWish: "주말 오픈 시간을 조금 앞당겨주세요.", offset: -3, time: "16:30" },
  { id: "q9", trainer: "지민", praise: "긍정 에너지가 좋아서 수업이 즐거워요.", offset: -4, time: "13:45" },
  { id: "q10", centerWish: "락커 개수를 늘려주시면 좋겠어요.", offset: -5, time: "19:10" },
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
      <p className="text-xs text-fg-muted">회원 QR 설문 응답 · 칭찬 1건당 +{SCORE_PER}점</p>

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
            {shown.map((s) => {
              const named = Boolean(s.memberName);
              const snippet = s.praise ?? s.centerWish ?? "";
              return (
                <button key={s.id} type="button" onClick={() => setDetail(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: named ? avatarColor(s.memberName!) : "#3a3a44" }}
                  >
                    {named ? s.memberName![0] : "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{s.memberName ?? "익명 회원"}</span>
                      {s.trainer ? (
                        <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">
                          {s.trainer} 칭찬
                        </span>
                      ) : (
                        <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">센터 의견</span>
                      )}
                      {s.trainer && s.centerWish && (
                        <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">+의견</span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{snippet}</span>
                    <span className="mt-0.5 block text-[11px] text-fg-muted/70">
                      {dayLabel(s.offset)} {ampm(s.time)}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 응답 상세 ── */}
      {detail && (
        <div className="overlay-frame fixed inset-0 z-[80] flex items-center justify-center p-6">
          <button type="button" aria-label="닫기" onClick={() => setDetail(null)} className="absolute inset-0 bg-black/65" />
          <div className="animate-page-in relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/12 bg-surface">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-bold">설문 응답</p>
              <button type="button" onClick={() => setDetail(null)} aria-label="닫기" className="text-fg-muted transition hover:text-fg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {/* 응답자 */}
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: detail.memberName ? avatarColor(detail.memberName) : "#3a3a44" }}
                >
                  {detail.memberName ? detail.memberName[0] : "?"}
                </span>
                <div>
                  <p className="text-sm font-semibold">{detail.memberName ?? "익명 회원"}</p>
                  <p className="text-[11px] text-fg-muted">
                    {dayLabel(detail.offset)} {ampm(detail.time)}
                  </p>
                </div>
              </div>

              {/* 칭찬 (트레이너 지목) */}
              {detail.trainer && (
                <div className="rounded-lg border border-white/10 bg-surface-2 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-fg-muted">칭찬한 트레이너</span>
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">{detail.trainer}</span>
                    {detail.trainer === ME && (
                      <span className="ml-auto text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}점</span>
                    )}
                  </div>
                  <p className="text-sm leading-snug">{detail.praise}</p>
                </div>
              )}

              {/* 센터에 바라는 점 */}
              {detail.centerWish && (
                <div className="rounded-lg border border-white/10 bg-surface-2 p-3">
                  <p className="mb-1.5 text-xs font-semibold text-fg-muted">센터에 바라는 점</p>
                  <p className="text-sm leading-snug">{detail.centerWish}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
