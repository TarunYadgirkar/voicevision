import { NextRequest } from 'next/server';

const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isSameOrigin(origin: URL, req: NextRequest): boolean {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  return origin.origin === req.nextUrl.origin || (host !== null && origin.host === host);
}

function isLocalDevOrigin(origin: URL): boolean {
  return origin.protocol === 'http:' && LOCALHOST_HOSTS.has(origin.hostname);
}

function isAllowed(origin: URL, req: NextRequest): boolean {
  if (origin.protocol === 'chrome-extension:') return true;
  if (isLocalDevOrigin(origin)) return true;
  return isSameOrigin(origin, req);
}

// The web app, the Chrome extension, and a local dev server may call this route.
// Anything else gets no Access-Control-Allow-Origin, so the browser blocks the read.
export function corsHeaders(req: NextRequest): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };

  const raw = req.headers.get('origin');
  if (!raw) return headers;

  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    return headers;
  }

  if (isAllowed(origin, req)) {
    headers['Access-Control-Allow-Origin'] = raw;
  }
  return headers;
}
