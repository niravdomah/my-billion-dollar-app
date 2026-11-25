'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { get } from '@/lib/api';
import { label } from '@/lib/format';
import { ConfigList, Panel, SetBadge } from './ui';

type Config = { configured: boolean } & Record<string, string | number | boolean | null>;

function show(key: string, value: string | number | boolean | null): ReactNode {
  if (typeof value === 'boolean') return key.endsWith('Set') ? <SetBadge set={value} /> : value ? 'yes' : 'no';
  return value ?? '—';
}

// The backend's view of its own settings, read without connecting to anything.
export function ConfigPanel({ path, notConfigured }: { path: string; notConfigured: ReactNode }) {
  const [state, setState] = useState<{ config?: Config; error?: string } | null>(null);

  useEffect(() => {
    get<Config>(path).then((result) =>
      setState(result.ok ? { config: result.data } : { error: result.error }),
    );
  }, [path]);

  const rows = Object.entries(state?.config ?? {})
    .filter(([key]) => key !== 'configured')
    .map(([key, value]): [string, ReactNode] => [label(key), show(key, value)]);

  return (
    <Panel title="Configuration">
      {!state && <p className="text-sm text-muted">Loading…</p>}
      {state?.error && <p className="text-sm text-err">{state.error}</p>}
      {state?.config && !state.config.configured && (
        <p className="mb-3 text-sm text-muted">{notConfigured}</p>
      )}
      {rows.length > 0 && <ConfigList rows={rows} />}
    </Panel>
  );
}
