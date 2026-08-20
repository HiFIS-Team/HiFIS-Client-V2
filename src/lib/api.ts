/**
 * 서버 주소 — **화면은 여기 하나만 보고 부른다.**
 *
 * 예전에는 이 두 화면이 서버가 직접 내려주는 HTML 이라 `/survey/...` 처럼
 * 상대경로로 불렀다. 이제 `hifis.app` 과 `api.hifis.app` 이 갈려서 절대경로여야
 * 한다 (서버 CORS 에 `https://hifis.app` 이 이미 열려 있다).
 *
 * 값을 안 주면 운영이다 — 배포할 때 아무것도 안 넣어도 되게 그렇게 뒀다.
 */
export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.hifis.app'
).replace(/\/+$/, '');

/** 실패하면 던진다 — 화면마다 잡아서 안내를 다르게 그린다. */
export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw res;
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  return getJson<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 서버 `Rank` → 사람이 읽는 이름 (앱 `employee.dart` 와 같은 라벨) */
export const RANK_LABEL: Record<string, string> = {
  CEO: '대표',
  DEVELOPER: '개발자',
  MARKETER: '마케터',
  STORE_MANAGER: '점장',
  TEAM_LEAD: '팀장',
  TRAINER: '트레이너',
  FC: 'FC',
};

export type SurveyStaff = {
  id: string;
  name: string;
  rank: string;
  avatarColor: string;
};

export type SurveyBranch = {
  branchName: string;
  staff: SurveyStaff[];
};

export type Resolved = {
  id: string;
  text: string;
  resolvedAt: string;
};

export type TvData = {
  branchName: string;
  resolved: Resolved[];
};
