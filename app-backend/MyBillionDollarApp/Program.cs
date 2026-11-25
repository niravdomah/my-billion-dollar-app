using MyBillionDollarApp;

var builder = WebApplication.CreateBuilder(args);

// Setting the address in code wins over the base image's ASPNETCORE_URLS / ASPNETCORE_HTTP_PORTS,
// so the app always listens on PORT, the variable the Linx Portal sets from linx-app.yml.
builder.WebHost.UseUrls($"http://0.0.0.0:{builder.Configuration["PORT"] ?? "8042"}");

builder.Services.AddOpenApi();
builder.AddTelemetry();

var app = builder.Build();

app.UseApiErrors();

app.Use(async (context, next) =>
{
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
    if (context.Request.Path != "/health")
    {
        AppMetrics.ApiRequests.Add(1);
    }
});

// Served in every environment, not only Development: the container runs as Production, and the
// deployed instance is where the API gets explored.
app.MapOpenApi();
app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "My Billion Dollar App API"));

app.MapGet("/", () => Results.Redirect("/swagger")).ExcludeFromDescription();

app.MapGet("/health", () => new { status = "Healthy" }).WithTags("General");

app.MapGet("/settings", () =>
{
    var secret = Env.Get("MY_SECRET_ENV");
    return new
    {
        myEnv = Env.Get("MY_ENV"),
        mySecretEnvSet = secret is not null,
        mySecretEnvLength = secret?.Length ?? 0,
    };
}).WithTags("General").WithSummary("Shows the values the Linx Portal configured, without revealing the secret.");

app.MapPostgres();
app.MapSqlServer();
app.MapObjectStorage();
app.MapDisk();

app.Run();
