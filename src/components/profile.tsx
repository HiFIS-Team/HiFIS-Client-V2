import type { ReactNode } from "react";

// 목: 현재 사용자
const PROFILE = {
  name: "김은후",
  email: "eunhoo@hifis.co.kr",
  empNo: "2024-0312",
  rank: "트레이너",
  team: "강남점",
  role: "일반 직원",
};

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export function Profile() {
  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 아바타 + 이름 + 이메일 */}
      <section className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-surface px-4 py-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/20 text-xl font-bold text-primary-bright">
          {PROFILE.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{PROFILE.name}</p>
          <p className="truncate text-sm text-fg-muted">{PROFILE.email}</p>
        </div>
      </section>

      {/* 사번 · 직급 · 팀 · 권한 */}
      <dl className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-surface px-4">
        <Row label="사번" value={PROFILE.empNo} />
        <Row label="직급" value={PROFILE.rank} />
        <Row label="팀" value={PROFILE.team} />
        <Row
          label="권한"
          value={
            <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs font-semibold text-fg-muted">
              {PROFILE.role}
            </span>
          }
        />
      </dl>
    </div>
  );
}
