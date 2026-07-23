/**
 * HiFIS 백엔드 API 클라이언트 (FastAPI).
 *
 * - camelCase JSON · Bearer 토큰 · 에러는 `detail.code/message`(검증 실패만 배열).
 * - accessToken 은 메모리, refreshToken 은 localStorage(리로드 생존).
 * - 401 → refresh 로 access 재발급 후 원요청 1회 재시도.
 *
 * 참고: 백엔드 실측 스펙은 `.claude/backend-api.md`. 구현(openapi.json)이 계약보다 우선.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8001";
const REFRESH_KEY = "hifis-refresh";

export const API_BASE = BASE;
/** 서버가 준 상대 경로(`/uploads/...`)를 절대 URL로. 이미 절대면 그대로. */
export const assetUrl = (path: string) => (path.startsWith("http") ? path : `${BASE}${path}`);

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

export const getRefreshToken = (): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
};
export const setRefreshToken = (t: string | null) => {
  if (typeof localStorage === "undefined") return;
  if (t) localStorage.setItem(REFRESH_KEY, t);
  else localStorage.removeItem(REFRESH_KEY);
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
