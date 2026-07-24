/**
 * HiFIS 백엔드 API 클라이언트 (FastAPI).
 *
 * - camelCase JSON · Bearer 토큰 · 에러는 `detail.code/message`(검증 실패만 배열).
 * - accessToken 은 메모리, refreshToken 은 localStorage(리로드 생존).
 * - 401 → refresh 로 access 재발급 후 원요청 1회 재시도.
 *
 * 참고: 백엔드 실측 스펙은 `.claude/backend-api.md`. 구현(openapi.json)이 계약보다 우선.
 */

// API base 자동 감지 — 접속한 호스트 기준으로 백엔드(8001)를 가리킨다.
//  - 데스크톱 localhost:3000 → http://localhost:8001
//  - 폰 등 LAN(192.168.x.x:3000) → http://192.168.x.x:8001  ⇒ 폰은 무설정으로 접속
// 원격 백엔드를 쓰려면 NEXT_PUBLIC_API_BASE 를 '로컬 아닌' URL 로 지정(그 값이 우선).
function resolveBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE;
  const envIsLocal = !env || /localhost|127\.0\.0\.1/.test(env);
  if (typeof window !== "undefined" && envIsLocal) {
    return `${window.location.protocol}//${window.location.hostname}:8001`;
  }
  return env ?? "http://localhost:8001";
}
const BASE = resolveBase();
const REFRESH_KEY = "hifis-refresh";

export const API_BASE = BASE;
/** 서버가 준 상대 경로(`/uploads/...`)를 절대 URL로. 이미 절대면 그대로. */
export const assetUrl = (path: string) => (path.startsWith("http") ? path : `${BASE}${path}`);

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
// WebSocket(사내톡) 연결 시 쿼리로 붙일 access 토큰. 브라우저 WS는 헤더를 못 넣어 쿼리로 전달.
export const getAccessToken = (): string | null => accessToken;

// refreshToken 저장 위치로 "로그인 유지"를 구현한다.
//   persist=true  → localStorage  (브라우저를 닫아도 14일 자동로그인)
//   persist=false → sessionStorage (탭/브라우저를 닫으면 소멸 → 다음 실행 시 재로그인)
export const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY) ?? sessionStorage.getItem(REFRESH_KEY);
};
export const setRefreshToken = (t: string | null, persist = true) => {
  if (typeof window === "undefined") return;
  // 저장 위치가 바뀔 수 있으니 항상 양쪽을 먼저 비운다.
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  if (t) (persist ? localStorage : sessionStorage).setItem(REFRESH_KEY, t);
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// refresh 로 새 access 발급. 성공 시 accessToken 갱신.
async function refreshAccess(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    if (!data?.accessToken) return false;
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

/**
 * 부트스트랩 세션 복구 전용 — refresh 토큰으로 access 를 "미리" 발급한다.
 * 이렇게 하면 이후 /auth/me 가 처음부터 Bearer 를 달고 한 번에 성공하므로,
 * 리로드마다 찍히던 `/auth/me 401`(무토큰 첫 호출) 콘솔 에러가 사라진다.
 * refresh 가 만료·무효라 실패하면 스테일 토큰을 정리 → 다음 리로드에 401 을 반복하지 않는다.
 */
export async function bootstrapAccess(): Promise<boolean> {
  const ok = await refreshAccess();
  if (!ok) setRefreshToken(null);
  return ok;
}

async function request<T>(method: string, path: string, body?: unknown, isForm = false, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: isForm ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // access 만료 → refresh 후 1회 재시도.
  // 토큰을 직접 다루는 엔드포인트만 제외한다(login/signup/refresh/logout).
  // ⚠️ /auth/me 는 포함해야 함 — 리로드 시 여기서 refresh 로 세션이 복구된다.
  const noRefresh = path === "/auth/login" || path === "/auth/signup" || path === "/auth/refresh" || path === "/auth/logout";
  if (res.status === 401 && !retried && !noRefresh) {
    if (await refreshAccess()) return request<T>(method, path, body, isForm, true);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const d = (data as { detail?: unknown } | null)?.detail;
    // (A) 도메인 에러: detail={code,message} / (B) 검증 에러: detail=[...]
    if (Array.isArray(d)) {
      const first = d[0] as { msg?: string } | undefined;
      throw new ApiError(res.status, "VALIDATION_ERROR", first?.msg ?? "입력값을 확인해주세요.");
    }
    const obj = d as { code?: string; message?: string } | undefined;
    throw new ApiError(res.status, obj?.code ?? "ERROR", obj?.message ?? res.statusText);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
  del: <T>(p: string, b?: unknown) => request<T>("DELETE", p, b),
  upload: <T>(p: string, form: FormData) => request<T>("POST", p, form, true),
};
