"use client";

import { useState } from "react";

/**
 * 회원 친절도
 *
 * 회원이 매장에 배치된 QR(앱 밖, 프린트물)을 스캔해 설문을 작성한다.
 * 설문 = ①어느 트레이너가 친절했나(칭찬) + ②센터에 바라는 점.
 * 이 탭은 그 **수신된 설문 응답을 보여주기만** 한다(읽기 전용, 트레이너가 입력 X).
 * 칭찬 1건당 +10점 → 친절왕 랭킹에 반영. 지금은 목(백엔드 수신 데이터로 교체).
 */

const SCORE_PER = 10; // 칭찬 1건당 +10점
const ME = "은후"; // 현재 트레이너 (목)

// 랭킹에 올라오는 트레이너 (칭찬 0건이어도 표시)
const TRAINERS = ["은후", "지민", "현우", "서연", "민준"];

type Survey = {
  id: string;
  memberName?: string; // 응답 회원 (익명 가능)
  trainer?: string; // 칭찬한 트레이너 (센터 피드백만 남기면 없음)
  praise?: string; // 칭찬 내용
  centerWish?: string; // 센터에 바라는 점
  offset: number; // 오늘 기준 일수 (0=오늘, 음수=과거)
  time: string; // HH:MM
};

// 수신된 설문 응답 (목)
const SEED: Survey[] = [
  { id: "q1", memberName: "김서준", trainer: "은후", praise: "항상 웃으면서 맞아주시고 운동 끝나고 스트레칭까지 챙겨주세요.", offset: 0, time: "10:30" },
  { id: "q2", trainer: "지민", praise: "자세 교정을 꼼꼼하게 봐주셔서 좋았어요.", offset: 0, time: "09:15" },
  { id: "q3", memberName: "이하은", trainer: "은후", praise: "PT 시간 잘 지켜주시고 친절하세요.", centerWish: "샤워실 수압이 조금 약해요.", offset: -1, time: "18:40" },
  { id: "q4", trainer: "현우", praise: "설명이 쉽고 친절해서 초보인데도 편했어요.", offset: -1, time: "14:05" },
  { id: "q5", trainer: undefined, centerWish: "정수기 옆에 종이컵이 자주 떨어져 있어요.", offset: -1, time: "12:20" },
  { id: "q6", memberName: "최지우", trainer: "서연", praise: "데스크에서 항상 반갑게 맞아주세요.", offset: -2, time: "11:10" },
  { id: "q7", trainer: "은후", praise: "운동 힘들 때 긍정적으로 이끌어주셔서 감사해요.", offset: -2, time: "20:00" },
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

const MEDAL = ["🥇", "🥈", "🥉"];
const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 7H4.5A1.5 1.5 0 0 0 3 8.5V13a2 2 0 0 0 2 2h2a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Zm12 0h-2.5A1.5 1.5 0 0 0 15 8.5V13a2 2 0 0 0 2 2h2a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1Z" />
    </svg>
  );
}

export function MemberKindness() {
  // 회원이 채우는 데이터 → 여기선 읽기만 (setter 없음)
  const [surveys] = useState<Survey[]>(SEED);

  const praiseOf = (t: string) => surveys.filter((s) => s.trainer === t).length;
  const ranking = TRAINERS.map((name) => ({ name, count: praiseOf(name) })).sort((a, b) => b.count - a.count);
  const myCount = praiseOf(ME);
  const myScore = myCount * SCORE_PER;
  const myRank = ranking.findIndex((r) => r.name === ME) + 1;

  const myPraises = surveys.filter((s) => s.trainer === ME && s.praise);
  const wishes = surveys.filter((s) => s.centerWish);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      {/* 이 화면이 뭔지 — 회원 QR 설문 응답 */}
      <p className="text-xs text-fg-muted">회원 QR 설문 응답 · 칭찬 1건당 +{SCORE_PER}점</p>

      {/* 요약 (내 기준) */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "받은 칭찬", value: `${myCount}건` },
          { label: "내 점수", value: `${myScore}점`, accent: true },
          { label: "친절왕 순위", value: `${myRank}위` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-surface px-3 py-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.accent ? "text-primary-bright" : ""}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 친절왕 랭킹 — 칭찬 수 기준 (랭킹 페이지로 이어짐) */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">🏆 친절왕 랭킹</p>
        <div className="divide-y divide-white/5">
          {ranking.map((r, i) => {
            const me = r.name === ME;
            return (
              <div key={r.name} className={`flex items-center gap-3 px-4 py-2.5 ${me ? "bg-primary/10" : ""}`}>
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums">
                  {i < 3 ? <span className="text-base">{MEDAL[i]}</span> : <span className="text-fg-muted">{i + 1}</span>}
                </span>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: avatarColor(r.name) }}
                >
                  {r.name[0]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {r.name}
                  {me && <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">나</span>}
                </span>
                <span className="shrink-0 text-xs text-fg-muted tabular-nums">칭찬 {r.count}</span>
                <span className="w-12 shrink-0 text-right text-xs font-bold text-primary-bright tabular-nums">
                  {r.count * SCORE_PER}점
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 내가 받은 칭찬 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          내가 받은 칭찬 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{myPraises.length}</span>
        </p>
        {myPraises.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">아직 받은 칭찬이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {myPraises.map((s) => (
              <div key={s.id} className="flex gap-2.5 px-4 py-3">
                <QuoteIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{s.praise}</p>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    {s.memberName ?? "익명 회원"} · {dayLabel(s.offset)} {ampm(s.time)}
                  </p>
                </div>
                <span className="shrink-0 self-start text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 센터에 바라는 점 — 설문의 센터 피드백 (트레이너 무관, 전체용) */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          센터에 바라는 점 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{wishes.length}</span>
        </p>
        {wishes.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">아직 접수된 의견이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {wishes.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <p className="text-sm leading-snug">{s.centerWish}</p>
                <p className="mt-1 text-[11px] text-fg-muted">
                  {s.memberName ?? "익명 회원"} · {dayLabel(s.offset)} {ampm(s.time)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
