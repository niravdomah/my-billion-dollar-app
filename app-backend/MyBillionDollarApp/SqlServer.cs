using Microsoft.Data.SqlClient;

namespace MyBillionDollarApp;

static class SqlServer
{
    // The Linx Portal maps MSSQL_CONNECTION_STRING to a database's connection_string key. The region decides
    // the TLS terms in it, so the string is used exactly as given and never rebuilt here.
    //
    // Without it the connection is built from the separate keys (MSSQL_HOST, MSSQL_PORT, MSSQL_NAME,
    // MSSQL_USER, MSSQL_PASSWORD) with a hosted server's terms: encrypted, and the certificate validated.
    private static string Source() => Env.Get("MSSQL_CONNECTION_STRING") is null ? "parts" : "connection_string";

    private static string ConnectionString()
    {
        var connectionString = Env.Get("MSSQL_CONNECTION_STRING");
        if (connectionString is not null) return connectionString;

        var host = Env.Require("MSSQL_HOST", "MSSQL_CONNECTION_STRING");
        var port = Env.Get("MSSQL_PORT");
        return new SqlConnectionStringBuilder
        {
            DataSource = port is null ? host : $"{host},{port}",
            InitialCatalog = Env.Require("MSSQL_NAME", "MSSQL_CONNECTION_STRING"),
            UserID = Env.Require("MSSQL_USER", "MSSQL_CONNECTION_STRING"),
            Password = Env.Require("MSSQL_PASSWORD", "MSSQL_CONNECTION_STRING"),
            Encrypt = SqlConnectionEncryptOption.Mandatory,
            TrustServerCertificate = false,
        }.ConnectionString;
    }

    private static async Task<SqlConnection> OpenAsync()
    {
        var connection = new SqlConnection(ConnectionString());
        await connection.OpenAsync();
        return connection;
    }

    public static void MapSqlServer(this WebApplication app)
    {
        var mssql = app.MapGroup("/mssql").WithTags("SQL Server");

        mssql.MapGet("/config", () =>
        {
            if (Env.Get("MSSQL_CONNECTION_STRING") is null && Env.Get("MSSQL_HOST") is null)
            {
                return Results.Ok(new { configured = false });
            }
            var settings = new SqlConnectionStringBuilder(ConnectionString());
            return Results.Ok(new
            {
                configured = true,
                source = Source(),
                server = settings.DataSource,
                database = settings.InitialCatalog,
                user = settings.UserID,
                encrypt = settings.Encrypt.ToString(),
                trustServerCertificate = settings.TrustServerCertificate,
                passwordSet = !string.IsNullOrEmpty(settings.Password),
            });
        }).WithSummary("Shows the connection settings without connecting.");

        mssql.MapGet("/db", async () =>
        {
            var settings = new SqlConnectionStringBuilder(ConnectionString());
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand("SELECT DB_NAME(), SUSER_NAME(), @@VERSION", connection);
            await using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            return Results.Ok(new
            {
                source = Source(),
                server = settings.DataSource,
                database = reader.GetString(0),
                login = reader.GetString(1),
                encrypt = settings.Encrypt.ToString(),
                trustServerCertificate = settings.TrustServerCertificate,
                version = reader.GetString(2).Split((char)10)[0].Trim(),
            });
        }).WithSummary("Connects and reports the database, login, encryption and server version.");

        mssql.MapGet("/db/create", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand("""
                IF OBJECT_ID('dbo.portal_check', 'U') IS NULL
                    CREATE TABLE dbo.portal_check (
                        id INT IDENTITY PRIMARY KEY,
                        note NVARCHAR(200) NOT NULL,
                        at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME());
                """, connection);
            await command.ExecuteNonQueryAsync();
            return Results.Ok("dbo.portal_check ready");
        }).WithSummary("Creates the dbo.portal_check notes table.");

        mssql.MapGet("/db/write", async (string note, ILoggerFactory loggers) =>
        {
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand(
                "INSERT INTO dbo.portal_check (note) OUTPUT INSERTED.id VALUES (@note)", connection);
            command.Parameters.AddWithValue("@note", note);
            var id = await command.ExecuteScalarAsync();
            AppMetrics.NotesWritten.Add(1);
            loggers.CreateLogger("SqlServer").LogInformation("Wrote note {Id} to SQL Server", id);
            return Results.Ok(new { id, note });
        }).WithSummary("Adds a note to dbo.portal_check.");

        mssql.MapGet("/db/read", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand(
                "SELECT id, note, at FROM dbo.portal_check ORDER BY id DESC", connection);
            await using var reader = await command.ExecuteReaderAsync();
            var rows = new List<object>();
            while (await reader.ReadAsync())
            {
                rows.Add(new { id = reader.GetInt32(0), note = reader.GetString(1), at = reader.GetDateTime(2) });
            }
            return Results.Ok(rows);
        }).WithSummary("Lists the notes in dbo.portal_check, newest first.");

        // Shows the credential is scoped to its own database: on a shared server this returns the one
        // database and master, never a neighbour's.
        mssql.MapGet("/db/visible", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand("SELECT name FROM sys.databases ORDER BY name", connection);
            await using var reader = await command.ExecuteReaderAsync();
            var names = new List<string>();
            while (await reader.ReadAsync())
            {
                names.Add(reader.GetString(0));
            }
            return Results.Ok(names);
        }).WithSummary("Lists the databases this login can see.");

        mssql.MapGet("/db/drop", async () =>
        {
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand("DROP TABLE IF EXISTS dbo.portal_check", connection);
            await command.ExecuteNonQueryAsync();
            return Results.Ok("dbo.portal_check dropped");
        }).WithSummary("Drops the dbo.portal_check table.");

        mssql.MapPost("/query", async (SqlRequest request, ILoggerFactory loggers) =>
        {
            SqlResults.RequireSql(request);
            await using var connection = await OpenAsync();
            await using var command = new SqlCommand(request.Sql, connection);
            await using var reader = await command.ExecuteReaderAsync();
            var result = await SqlResults.ReadAsync(reader);
            AppMetrics.SqlQueries.Add(1);
            loggers.CreateLogger("SqlServer").LogInformation("Ran a free-form SQL Server query");
            return Results.Ok(result);
        }).WithSummary("Runs any T-SQL and returns its first result set (at most 500 rows).");
    }
}
