export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    const { startTelemetry } = await import('./lib/telemetry');
    startTelemetry();
  }
}
