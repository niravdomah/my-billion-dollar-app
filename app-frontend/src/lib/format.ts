const LABELS: Record<string, string> = {
  accessKey: 'Access key',
  bucket: 'Bucket',
  database: 'Database',
  elapsedMs: 'Time (ms)',
  encrypt: 'Encrypt',
  endpoint: 'Endpoint',
  exists: 'Exists',
  healthy: 'Healthy',
  host: 'Host',
  login: 'Login',
  passwordSet: 'Password',
  path: 'Path',
  port: 'Port',
  secretKeySet: 'Secret key',
  server: 'Server',
  sslMode: 'SSL mode',
  tls: 'TLS',
  trustServerCertificate: 'Trust server certificate',
  user: 'User',
  version: 'Version',
};

export const label = (key: string) => LABELS[key] ?? key;

// A backend answer as "Label: value" lines, for the status boxes.
export function describe(data: unknown): string {
  if (typeof data !== 'object' || data === null) return String(data);
  return Object.entries(data)
    .map(([key, value]) => `${label(key)}: ${value ?? '—'}`)
    .join('\n');
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}

export const formatDate = (value: string) => new Date(value).toLocaleString();
