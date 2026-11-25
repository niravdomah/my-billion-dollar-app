import { metrics } from '@opentelemetry/api';
import { logs } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import {
  defaultResource,
  detectResources,
  envDetector,
  serviceNameEnvDetector,
} from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

// The Linx Portal injects OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES, and its
// collector takes OTLP over HTTP. It charts counters, gauges and logs and refuses traces, so no tracer is set up.
export function startTelemetry() {
  const resource = defaultResource().merge(
    detectResources({ detectors: [envDetector, serviceNameEnvDetector] }),
  );

  metrics.setGlobalMeterProvider(
    new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis: 15_000,
        }),
      ],
    }),
  );

  logs.setGlobalLoggerProvider(
    new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
    }),
  );
}
