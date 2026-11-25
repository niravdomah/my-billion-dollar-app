import Link from 'next/link';
import { connection } from 'next/server';
import { backendEndpoint, backendUrl, configuredBackendUrl } from '@/lib/backend-url';
import { Code, ConfigList, Panel, SetBadge } from '@/components/ui';

interface Settings {
  myEnv: string | null;
  mySecretEnvSet: boolean;
  mySecretEnvLength: number;
}

type Probe<T> = { ok: true; data: T } | { ok: false; error: string };

async function probe<T>(path: string): Promise<Probe<T>> {
  const url = backendEndpoint(path);
  if (!url) return { ok: false, error: 'SETTING__BackendUrl must be a host:port, or an http:// or https:// address.' };
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return { ok: false, error: `${response.status} ${response.statusText}` };
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const cause = error instanceof Error ? (error.cause as { code?: string } | undefined) : undefined;
    return { ok: false, error: cause?.code ?? (error instanceof Error ? error.message : String(error)) };
  }
}

const AREAS = [
  { href: '/postgres', title: 'PostgreSQL', text: 'Connect, keep notes in a table, and run SQL.' },
  { href: '/mssql', title: 'SQL Server', text: 'The same, against SQL Server with T-SQL.' },
  { href: '/s3', title: 'Object storage', text: 'List, write, upload, download and delete objects in a bucket.' },
  { href: '/disk', title: 'Disk', text: 'Check the persistent disk, and work with the files on it.' },
];

export default async function HomePage() {
  await connection();
  const [health, settings] = await Promise.all([probe<{ status: string }>('/health'), probe<Settings>('/settings')]);
  const address = configuredBackendUrl();

  return (
    <>
      <header className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">My Billion Dollar App</h1>
        <p className="text-lg text-muted">
          A Next.js frontend and a .NET backend, built, deployed and hosted by the Linx Portal.
        </p>
      </header>

      <Panel title="Backend">
        <ConfigList
          rows={[
            ['Address', address ?? `${backendUrl()?.origin ?? '—'} (default)`],
            [
              'Status',
              health.ok ? (
                <span className="text-ok">● Connected</span>
              ) : (
                <span className="text-err">● Not reachable: {health.error}</span>
              ),
            ],
          ]}
        />
        <p className="mt-3 text-sm text-muted">
          The frontend passes every API call on to this address, set in <Code>SETTING__BackendUrl</Code>. In the Linx
          Portal it is the backend instance&apos;s internal address, which only works inside the environment.
        </p>
      </Panel>

      <Panel title="Settings from the Linx Portal">
        {settings.ok ? (
          <ConfigList
            rows={[
              ['MY_ENV', settings.data.myEnv ?? '—'],
              [
                'MY_SECRET_ENV',
                <span key="secret" className="flex items-center gap-2">
                  <SetBadge set={settings.data.mySecretEnvSet} />
                  {settings.data.mySecretEnvSet && (
                    <span className="text-muted">{settings.data.mySecretEnvLength} characters, value hidden</span>
                  )}
                </span>,
              ],
            ]}
          />
        ) : (
          <p className="text-sm text-err">Could not read the backend&apos;s settings: {settings.error}</p>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        {AREAS.map((area) => (
          <Link
            key={area.href}
            href={area.href}
            className="rounded-lg border border-line bg-panel px-5 py-4 hover:border-accent"
          >
            <h2 className="mb-1 text-lg font-semibold text-accent">{area.title} →</h2>
            <p className="text-sm text-muted">{area.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
