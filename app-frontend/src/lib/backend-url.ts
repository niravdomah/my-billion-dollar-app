const DEFAULT_BACKEND_URL = 'http://localhost:8042';

// Read on the server on every call, so the address can change in the Linx Portal without a rebuild.
export function configuredBackendUrl(): string | undefined {
  return process.env.SETTING__BackendUrl || undefined;
}

// The Linx Portal shows an internal address as host:port, with no scheme, so one is added when it's missing.
const withScheme = (address: string) => (/^[a-z][a-z0-9+.-]*:\/\//i.test(address) ? address : `http://${address}`);

export function backendUrl(): URL | null {
  try {
    const url = new URL(withScheme(configuredBackendUrl() ?? DEFAULT_BACKEND_URL));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function backendEndpoint(path: string): URL | null {
  const url = backendUrl();
  if (!url) return null;
  url.pathname = `${url.pathname.replace(/\/$/, '')}${path}`;
  return url;
}
