export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public nextPixelAt?: number,
    public serverTime?: number,
  ) { super(message); }
}

export async function api<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    ...(body !== undefined ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    } : {}),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = payload.detail;
    throw new ApiError(
      typeof detail === 'string' ? detail : detail?.message ?? 'Не удалось связаться с сервером',
      response.status, detail?.next_pixel_at, detail?.server_time,
    );
  }
  return response.status === 204 ? undefined as T : response.json();
}

// One ID per document load. Retries and React StrictMode never add a second visit.
export function newPageId(): string {
  // getRandomValues also works on HTTP by IP, unlike crypto.randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const pageId = newPageId();
let visitStarted = false;
export function countPageView(): void {
  if (visitStarted) return;
  visitStarted = true;
  const send = (attempt: number) => {
    void api('/api/visits', { page_id: pageId }).catch(() => {
      if (attempt < 3) window.setTimeout(() => send(attempt + 1), 1500 * 2 ** attempt);
    });
  };
  send(0);
}
