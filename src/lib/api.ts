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

export async function patchJson<T>(path: string, body: unknown): Promise<T> {
  return getJson<T>(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 지우기 — 서버가 `204` 라 돌려줄 몸통이 없다 */
export async function deleteNothing(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw res;
}

/** 사진·영상 한 장 올리기 — 서버가 저장한 자리를 돌려준다 */
export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append('file', file);
  // `Content-Type` 을 손으로 안 넣는다 — 브라우저가 경계 문자열까지 붙여야 한다
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: form });
  if (!res.ok) throw res;
  return (await res.json()) as T;
}

/** 서버가 준 `/uploads/...` 를 브라우저가 부를 수 있는 주소로 */
export function fileUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
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

/* ── 매장 TV 추첨 (`/tv/{token}/draw`) ─────────────────────────── */

/** 참가자 한 명 — 서버가 이미 `김○후` · `···1234` 로 가려서 준다 */
export type DrawEntry = { name: string; phone: string };

/**
 * 그 달 추첨 — **당첨자는 이미 정해져 있다.**
 *
 * 화면은 `winnerIndexes` 셋이 1·2·3등이 되도록 굴릴 뿐이고, `seed` 는 굴러가는
 * 모양만 정한다. 그래서 TV 를 껐다 켜도 같은 공이 같은 길로 굴러간다.
 */
export type DrawData = {
  /** 이벤트가 열리는 달 `YYYY-MM` — 대상은 그 전달 설문이다 */
  period: string;
  game:
    | 'RACE' | 'HOOPS' | 'SOCCER' | 'CURLING' | 'CLAW' | 'SUMO'
    | 'PINBALL' | 'LADDER' | 'ROULETTE';
  seed: string;
  entries: DrawEntry[];
  /** 참가자가 없으면 null — 그 달 설문이 한 건도 없던 지점이다 */
  /** 당첨자들 — 앞에서부터 1·2·3등. 참가자가 셋보다 적으면 그만큼만 */
  winnerIndexes: number[];
};

/** 출석 이력 한 줄 — 서버가 전화번호를 이미 `010-****-1234` 로 가려서 준다 */
export type HistoryMember = {
  rank: number;
  name: string;
  phone: string;
  days: number;
  lastVisit: string;
  status: string;
};

export type HistoryData = {
  branchName: string;
  /** 어느 달의 값인가 — 달을 안 보내면 서버가 이번 달로 정한다 */
  month: string;
  highThreshold: number;
  lowThreshold: number;
  high: HistoryMember[];
  low: HistoryMember[];
};

/* ── 회원 수업 화면 (`/training/{token}`) ───────────────────────── */

export type WeightRow = {
  part: string;
  name: string;
  load: string;
  sets: string;
};

export type CardioRow = { name: string; duration: string };

/** 자료 한 장 — `url` 은 서버가 서명해 준 상대경로다 (그대로 다시 보내면 된다) */
export type MediaItem = { url: string; kind: 'IMAGE' | 'VIDEO' };

/** 한 번에 올린 자료 묶음 + 그 묶음에 달린 트레이너 피드백 */
export type MediaGroup = { items: MediaItem[]; feedback: string | null };

export type TrainingLog = {
  id: string;
  kind: 'PT' | 'PERSONAL';
  sessionNo: number | null;
  title: string;
  /** `2026-08-05` */
  performedOn: string;
  weights: WeightRow[];
  cardio: CardioRow[];
  media: MediaGroup[];
  /** 개인 운동에 트레이너가 단 총평 — **여기서는 읽기만 한다** */
  trainerFeedback: string | null;
  /** 회원이 직접 쓴 줄인가 — 참일 때만 고치고 지울 수 있다 */
  mine: boolean;
};

export type TrainingData = {
  memberName: string;
  trainerName: string;
  goals: string[];
  pt: TrainingLog[];
  personal: TrainingLog[];
};

/** 회원이 새로 적거나 고쳐 보내는 개인 운동 — 트레이너 피드백 칸이 **없다** */
export type PersonalLogIn = {
  title: string;
  performedOn: string;
  weights: WeightRow[];
  cardio: CardioRow[];
  media: MediaGroup[];
};
