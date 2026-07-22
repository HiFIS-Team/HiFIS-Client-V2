"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth";
import { listKindnessSurveys, type KindnessSurveyDTO } from "@/lib/api/hifis";

/**
 * 회원 친절도 — **백엔드 연동(Phase 3)**.
 *
 * 회원이 매장 QR(앱 밖·프린트물)을 스캔해 외부 폼에 설문을 작성 → 백엔드 웹훅으로 수신.
 * 이 탭은 **로그인한 직원이 "칭찬하고 싶은 직원"으로 지목된 응답**(=내게 온 칭찬)을 보여준다(읽기 전용).
 * 칭찬 1건당 +10점(KINDNESS). ⚠️ 친절왕 랭킹은 여기 아님(별도 랭킹 페이지).
 * ⚠️ 트레이너(MEMBER)는 직원 명단을 못 봐서 남을 칭찬한 응답의 이름은 표시 불가 → 내게 온 것만 스코프.
 */

const SCORE_PER = 10;

const pad = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface-2 p-3">
      <p className="mb-1 text-xs font-semibold text-fg-muted">{label}</p>
      {children}
    </div>
  );
}

export function MemberKindness() {
  const { user } = useAuth();
  const meId = user?.id;

  const [surveys, setSurveys] = useState<KindnessSurveyDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<KindnessSurveyDTO | null>(null);

  useEffect(() => {
    if (!meId) return;
    let alive = true;
    listKindnessSurveys({ praisedEmployeeId: meId })
      .then((rows) => {
        if (alive) setSurveys(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [meId]);

  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetail(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  const myCount = surveys.length;
  const myScore = myCount * SCORE_PER;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <p className="text-xs text-fg-muted">회원 QR 설문 응답 · 내가 칭찬받은 것 · 1건당 +{SCORE_PER}점</p>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "받은 칭찬", value: `${myCount}건` },
          { label: "내 점수", value: `${myScore}점`, accent: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-surface px-3 py-3 text-center">
            <p className={`text-xl font-bold tabular-nums ${s.accent ? "text-primary-bright" : ""}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 응답 목록 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          내게 온 칭찬 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{surveys.length}</span>
        </p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : surveys.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 받은 칭찬이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {surveys.map((s) => (
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
                      {user?.name ?? "나"} 칭찬
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{s.praiseComment}</span>
                  <span className="mt-0.5 block text-[11px] text-fg-muted/70">{fmtDateTime(s.submittedAt)}</span>
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
              <p className="text-[11px] text-fg-muted">{fmtDateTime(detail.submittedAt)} 접수</p>

              <Field label="운동 시작 계기">
                <p className="text-sm leading-snug">{detail.motivation}</p>
              </Field>

              <Field label="칭찬하고 싶은 직원">
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary-bright">{user?.name ?? "나"}</span>
                  <span className="ml-auto text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER}점</span>
                </div>
                <p className="text-sm leading-snug">{detail.praiseComment}</p>
              </Field>

              <Field label="피트니스스타가 보완하면 좋을 부분">
                <p className="text-sm leading-snug">{detail.improvement}</p>
              </Field>

              <Field label="성함 · 연락처">
                <p className="text-sm">
                  {detail.memberName}
                  <span className="ml-2 text-fg-muted tabular-nums">{detail.memberPhone}</span>
                </p>
              </Field>

              <Field label="개인정보 수집·이용 동의">
                <span className="inline-block rounded-full bg-emerald-400/12 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  {detail.consent ? "동의함" : "미동의"}
                </span>
              </Field>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
