import { metrics, type Counter } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

const SCOPE = 'my-billion-dollar-app-frontend';

type Level = 'info' | 'warn' | 'error';

const SEVERITY: Record<Level, SeverityNumber> = {
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
};

// One JSON line on stdout (the container log) and, when telemetry is on, one OTLP log record.
export function log(level: Level, message: string, attributes: Record<string, string | number> = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...attributes });
  if (level === 'error') console.error(line);
  else console.log(line);

  logs.getLogger(SCOPE).emit({
    severityNumber: SEVERITY[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes,
  });
}

let counters: { calls: Counter; failures: Counter } | undefined;

// Created on first use, after instrumentation.ts has registered the meter provider.
export function countBackendCall(failed: boolean) {
  counters ??= {
    calls: metrics.getMeter(SCOPE).createCounter('backend_calls_total', {
      description: 'API calls the frontend passed on to the backend',
    }),
    failures: metrics.getMeter(SCOPE).createCounter('backend_call_failures_total', {
      description: 'Passed-on API calls the backend answered with an error, or did not answer',
    }),
  };
  counters.calls.add(1);
  if (failed) counters.failures.add(1);
}
