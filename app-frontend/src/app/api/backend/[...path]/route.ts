import type { NextRequest } from 'next/server';
import { backendEndpoint } from '@/lib/backend-url';
import { countBackendCall, log } from '@/lib/observability';

const REQUEST_HEADERS_NOT_FORWARDED = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
  'expect',
  'accept-encoding',
]);

// fetch() has already decompressed the body, so the backend's encoding and length no longer describe it.
const RESPONSE_HEADERS_NOT_RETURNED = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
]);

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

// Passes /api/backend/<path> on to the backend at SETTING__BackendUrl. The browser only ever talks to the
// frontend, so the backend can be reached on its internal address inside the environment.
async function forwardToBackend(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  if (path.some((segment) => segment === '.' || segment === '..')) {
    return Response.json({ error: 'Invalid API path.' }, { status: 400 });
  }

  const target = backendEndpoint(`/${path.map(encodeURIComponent).join('/')}`);
  if (!target) {
    return Response.json(
      { error: 'SETTING__BackendUrl must be a host:port, or an http:// or https:// address.' },
      { status: 500 },
    );
  }
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, name) => {
    if (!REQUEST_HEADERS_NOT_FORWARDED.has(name)) headers.set(name, value);
  });

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const started = Date.now();
  let backendResponse: Response;
  try {
    backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch (error) {
    countBackendCall(true);
    const reason = error instanceof Error ? describeFetchError(error) : String(error);
    log('error', 'backend unreachable', { method: request.method, path: target.pathname, reason });
    return Response.json(
      { error: `The backend isn't answering at ${target.origin} (${reason}).` },
      { status: 502 },
    );
  }

  countBackendCall(backendResponse.status >= 500);
  log('info', 'backend call', {
    method: request.method,
    path: target.pathname,
    status: backendResponse.status,
    durationMs: Date.now() - started,
  });

  const returnedHeaders = new Headers();
  backendResponse.headers.forEach((value, name) => {
    if (!RESPONSE_HEADERS_NOT_RETURNED.has(name)) returnedHeaders.append(name, value);
  });

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: returnedHeaders,
  });
}

// Node's fetch reports every network failure as "fetch failed"; the cause names what actually happened.
function describeFetchError(error: Error): string {
  const cause = error.cause as { code?: string; message?: string } | undefined;
  return cause?.code ?? cause?.message ?? error.message;
}

export {
  forwardToBackend as GET,
  forwardToBackend as POST,
  forwardToBackend as PUT,
  forwardToBackend as PATCH,
  forwardToBackend as DELETE,
};
