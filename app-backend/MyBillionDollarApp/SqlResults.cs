using System.Data.Common;

namespace MyBillionDollarApp;

record SqlRequest(string Sql);

static class SqlResults
{
    private const int MaxRows = 500;

    // Reads the first result set of a free-form query, for either engine.
    public static async Task<object> ReadAsync(DbDataReader reader)
    {
        var columns = Enumerable.Range(0, reader.FieldCount).Select(reader.GetName).ToArray();
        var rows = new List<object?[]>();
        var truncated = false;

        while (await reader.ReadAsync())
        {
            if (rows.Count == MaxRows)
            {
                truncated = true;
                break;
            }
            var row = new object?[reader.FieldCount];
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[i] = ToJson(reader.GetValue(i));
            }
            rows.Add(row);
        }

        await reader.CloseAsync();
        return new { columns, rows, rowCount = rows.Count, truncated, recordsAffected = reader.RecordsAffected };
    }

    public static void RequireSql(SqlRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Sql))
        {
            throw new BadRequestException("Enter a SQL query first.");
        }
    }

    // A query can return any column type, and not every type has a JSON form.
    private static object? ToJson(object value) => value switch
    {
        DBNull => null,
        double d when !double.IsFinite(d) => d.ToString(),
        float f when !float.IsFinite(f) => f.ToString(),
        string or bool or byte or short or int or long or float or double or decimal
            or Guid or DateTime or DateTimeOffset or TimeSpan => value,
        byte[] bytes => "0x" + Convert.ToHexString(bytes, 0, Math.Min(bytes.Length, 64)) + (bytes.Length > 64 ? "…" : ""),
        Array array => array.Cast<object>().Select(ToJson).ToArray(),
        _ => value.ToString(),
    };
}
