export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Every call goes to the frontend's own /api/backend route, which passes it on to the backend.
async function callBackend<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, { cache: 'no-store', ...init });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const text = await response.text();
  const body = parseJson(text);
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body ? String(body.error) : text;
    return { ok: false, error: message || `${response.status} ${response.statusText}` };
  }
  return { ok: true, data: (body === undefined ? text : body) as T };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const get = <T>(path: string) => callBackend<T>(path);

export const postJson = <T>(path: string, body: unknown) =>
  callBackend<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const postForm = <T>(path: string, form: FormData) =>
  callBackend<T>(path, { method: 'POST', body: form });

export const query = (params: Record<string, string>) => new URLSearchParams(params).toString();

export const downloadUrl = (path: string, key: string) => `/api/backend${path}?${query({ key })}`;
