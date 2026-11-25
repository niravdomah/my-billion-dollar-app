namespace MyBillionDollarApp;

static class Env
{
    // An empty variable counts as unset, so a blank value saved in the Linx Portal does not pass as configured.
    public static string? Get(string name) =>
        Environment.GetEnvironmentVariable(name) is { Length: > 0 } value ? value : null;

    public static string Require(string name, string alternative) =>
        Get(name) ?? throw new NotConfiguredException($"Neither {alternative} nor {name} is set.");
}
