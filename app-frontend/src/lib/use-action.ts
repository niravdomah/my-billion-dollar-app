'use client';

import { useState } from 'react';
import type { Status } from '@/components/StatusBox';
import type { ApiResult } from './api';

// Runs one backend call at a time for a panel and keeps its outcome for the panel's status box.
export function useAction() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  async function run<T>(
    call: () => Promise<ApiResult<T>>,
    success: (data: T) => string,
  ): Promise<T | undefined> {
    setBusy(true);
    setStatus(null);
    try {
      const result = await call();
      setStatus(
        result.ok
          ? { ok: true, message: success(result.data) }
          : { ok: false, message: result.error },
      );
      return result.ok ? result.data : undefined;
    } finally {
      setBusy(false);
    }
  }

  return { status, busy, run };
}
