using Npgsql;

namespace MyBillionDollarApp;

static class Postgres
{
    // The Linx Portal maps PG_CONNECTION_STRING to a database's connection_string key, in the form Npgsql reads:
    // Host=...;Port=5432;Database=...;Username=...;Password=...;SSL Mode=VerifyFull. The region decides the TLS
    // terms in it, so the string is used exactly as given and never rebuilt here.
    private static string ConnectionString() => Env.Require("PG_CONNECTION_STRING");

    private static async Task<NpgsqlConnection> OpenAsync()
    {
        var connection = new NpgsqlConnection(ConnectionString());
        await connection.OpenAsync();
        return connection;
    }

    public static void MapPostgres(this WebApplication app)
    {
        var pg = app.MapGroup("/pg").WithTags("PostgreSQL");

        pg.MapGet("/config", () =>
        {
            if (Env.Get("PG_CONNECTION_STRING") is null)
            {
                return Results.Ok(new { configured = false });
            }
            var settings = new NpgsqlConnectionStringBuilder(ConnectionString());
            return Results.Ok(new
            {
                configured = true,
                host = settings.Host,
                port = settings.Port,
                database = settings.Database,
                user = settings.Username,
                sslMode = settings.SslMode.ToString(),
                passwordSet = !string.IsNullOrEmpty(settings.Password),
            });
        }).WithSummary("Shows the connection settings without connecting.");

        pg.MapGet("/db", async () =>
        {
            var settings = new NpgsqlConnectionStringBuilder(ConnectionString());
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand("""
                SELECT current_database(), current_user, version(), s.ssl, s.version
                FROM pg_stat_ssl s
                WHERE s.pid = pg_backend_pid()
                """, connection);
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            return Results.Ok(new
            {
                host = settings.Host,
                port = settings.Port,
                database = reader.GetString(0),
                user = reader.GetString(1),
                sslMode = settings.SslMode.ToString(),
                tls = reader.GetBoolean(3) ? reader.GetString(4) : "off",
                version = reader.GetString(2).Split(" on ")[0],
            });
        }).WithSummary("Connects and reports the database, login, TLS and server version.");

        pg.MapGet("/db/create", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand("""
                CREATE TABLE IF NOT EXISTS portal_check (
                    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                    note VARCHAR(200) NOT NULL,
                    at TIMESTAMPTZ NOT NULL DEFAULT now())
                """, connection);
            await command.ExecuteNonQueryAsync();
            return Results.Ok("portal_check ready");
        }).WithSummary("Creates the portal_check notes table.");

        pg.MapGet("/db/write", async (string note, ILoggerFactory loggers) =>
        {
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand(
                "INSERT INTO portal_check (note) VALUES (@note) RETURNING id", connection);
            command.Parameters.AddWithValue("note", note);
            var id = await command.ExecuteScalarAsync();
            AppMetrics.NotesWritten.Add(1);
            loggers.CreateLogger("Postgres").LogInformation("Wrote note {Id} to PostgreSQL", id);
            return Results.Ok(new { id, note });
        }).WithSummary("Adds a note to portal_check.");

        pg.MapGet("/db/read", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand(
                "SELECT id, note, at FROM portal_check ORDER BY id DESC", connection);
            await using var reader = await command.ExecuteReaderAsync();
            var rows = new List<object>();
            while (await reader.ReadAsync())
            {
                rows.Add(new { id = reader.GetInt32(0), note = reader.GetString(1), at = reader.GetDateTime(2) });
            }
            return Results.Ok(rows);
        }).WithSummary("Lists the notes in portal_check, newest first.");

        pg.MapGet("/db/drop", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand("DROP TABLE IF EXISTS portal_check", connection);
            await command.ExecuteNonQueryAsync();
            return Results.Ok("portal_check dropped");
        }).WithSummary("Drops the portal_check table.");

        pg.MapPost("/query", async (SqlRequest request, ILoggerFactory loggers) =>
        {
            SqlResults.RequireSql(request);
            await using var connection = await OpenAsync();
            await using var command = new NpgsqlCommand(request.Sql, connection);
            await using var reader = await command.ExecuteReaderAsync();
            var result = await SqlResults.ReadAsync(reader);
            AppMetrics.SqlQueries.Add(1);
            loggers.CreateLogger("Postgres").LogInformation("Ran a free-form PostgreSQL query");
            return Results.Ok(result);
        }).WithSummary("Runs any SQL and returns its first result set (at most 500 rows).");
    }
}
