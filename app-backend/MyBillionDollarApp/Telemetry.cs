using System.Diagnostics.Metrics;
using OpenTelemetry.Exporter;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;

namespace MyBillionDollarApp;

static class Telemetry
{
    // The Linx Portal injects OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME and OTEL_RESOURCE_ATTRIBUTES into
    // every instance, and its collector takes OTLP over HTTP (port 4318), not the .NET exporter's default gRPC.
    // It charts counters and gauges and refuses traces and histograms, so only the app's own meter is exported.
    public static void AddTelemetry(this WebApplicationBuilder builder)
    {
        if (string.IsNullOrEmpty(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            return;
        }

        builder.Services.AddOpenTelemetry()
            .WithMetrics(metrics => metrics
                .AddMeter(AppMetrics.MeterName)
                .AddOtlpExporter((exporter, reader) =>
                {
                    exporter.Protocol = OtlpExportProtocol.HttpProtobuf;
                    reader.PeriodicExportingMetricReaderOptions.ExportIntervalMilliseconds = 15_000;
                }))
            .WithLogging(logging => logging
                .AddOtlpExporter(options => options.Protocol = OtlpExportProtocol.HttpProtobuf));
    }
}

static class AppMetrics
{
    public const string MeterName = "MyBillionDollarApp";

    private static readonly Meter Meter = new(MeterName);

    public static readonly Counter<long> ApiRequests =
        Meter.CreateCounter<long>("api_requests_total", description: "API requests handled, health checks excluded");

    public static readonly Counter<long> NotesWritten =
        Meter.CreateCounter<long>("notes_written_total", description: "Notes written to PostgreSQL or SQL Server");

    public static readonly Counter<long> SqlQueries =
        Meter.CreateCounter<long>("sql_queries_total", description: "Free-form SQL queries run");

    public static readonly Counter<long> FilesStored =
        Meter.CreateCounter<long>("files_stored_total", description: "Files written to object storage or the disk");

    static AppMetrics() =>
        Meter.CreateObservableGauge("disk_free_bytes", DiskFreeBytes, unit: "By", description: "Free space on the disk at DISK_PATH");

    private static IEnumerable<Measurement<long>> DiskFreeBytes()
    {
        var path = Env.Get("DISK_PATH");
        if (path is null || !Directory.Exists(path))
        {
            yield break;
        }
        yield return new Measurement<long>(new DriveInfo(path).AvailableFreeSpace);
    }
}
