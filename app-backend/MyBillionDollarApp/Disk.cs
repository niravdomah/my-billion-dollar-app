using System.Diagnostics;

namespace MyBillionDollarApp;

static class Disk
{
    private const long MaxReadBytes = 1024 * 1024;

    private static string Root()
    {
        var path = Env.Get("DISK_PATH") ?? throw new NotConfiguredException("DISK_PATH is not set.");
        return Directory.Exists(path)
            ? Path.GetFullPath(path)
            : throw new NotConfiguredException($"DISK_PATH {path} does not exist.");
    }

    // Every path the API takes is relative to DISK_PATH and may not leave it.
    private static string Resolve(string? relative, bool allowRoot = false)
    {
        if (string.IsNullOrWhiteSpace(relative) && !allowRoot)
        {
            throw new BadRequestException("Enter a file name first.");
        }
        var root = Root();
        var full = Path.GetFullPath(Path.Combine(root, relative?.Trim() ?? ""));
        var rootWithSeparator = Path.EndsInDirectorySeparator(root) ? root : root + Path.DirectorySeparatorChar;
        if (full == root ? !allowRoot : !full.StartsWith(rootWithSeparator, StringComparison.Ordinal))
        {
            throw new BadRequestException("The path must stay inside DISK_PATH.");
        }
        return full;
    }

    private static string Relative(string full) => Path.GetRelativePath(Root(), full).Replace('\\', '/');

    public static void MapDisk(this WebApplication app)
    {
        var disk = app.MapGroup("/disk").WithTags("Disk");

        disk.MapGet("/config", () =>
        {
            var path = Env.Get("DISK_PATH");
            return new { configured = path is not null, path, exists = path is not null && Directory.Exists(path) };
        }).WithSummary("Shows the disk settings.");

        disk.MapGet("/health", async () =>
        {
            var stopwatch = Stopwatch.StartNew();
            var probe = Path.Combine(Root(), $".health-check-{Guid.NewGuid():N}.tmp");
            var written = Guid.NewGuid().ToString();
            try
            {
                await File.WriteAllTextAsync(probe, written);
                var read = await File.ReadAllTextAsync(probe);
                return read == written
                    ? Results.Ok(new { healthy = true, path = Root(), elapsedMs = stopwatch.ElapsedMilliseconds })
                    : Results.Problem("The file read back differs from the file written.");
            }
            finally
            {
                File.Delete(probe);
            }
        }).WithSummary("Writes a file, reads it back, checks it and deletes it.");

        disk.MapGet("/stats", () =>
        {
            var drive = new DriveInfo(Root());
            return new
            {
                totalBytes = drive.TotalSize,
                freeBytes = drive.AvailableFreeSpace,
                usedBytes = drive.TotalSize - drive.AvailableFreeSpace,
            };
        }).WithSummary("Reports total, used and free space.");

        disk.MapGet("/list", (string? path) =>
        {
            var directory = new DirectoryInfo(Resolve(path, allowRoot: true));
            var folders = directory.EnumerateDirectories().OrderBy(d => d.Name).Select(d => new
            {
                name = d.Name, path = Relative(d.FullName), type = "folder", size = (long?)null, modified = d.LastWriteTimeUtc,
            });
            var files = directory.EnumerateFiles().OrderBy(f => f.Name).Select(f => new
            {
                name = f.Name, path = Relative(f.FullName), type = "file", size = (long?)f.Length, modified = f.LastWriteTimeUtc,
            });
            return folders.Concat(files).ToList();
        }).WithSummary("Lists a folder on the disk.");

        disk.MapGet("/write", async (string key, string value, ILoggerFactory loggers) =>
        {
            var full = Resolve(key);
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            await File.WriteAllTextAsync(full, value);
            AppMetrics.FilesStored.Add(1);
            loggers.CreateLogger("Disk").LogInformation("Wrote file {Path}", Relative(full));
            return $"wrote {Relative(full)}";
        }).WithSummary("Writes a text file.");

        disk.MapPost("/upload", async (IFormFile file, [Microsoft.AspNetCore.Mvc.FromForm] string? key, ILoggerFactory loggers) =>
        {
            var full = Resolve(string.IsNullOrWhiteSpace(key) ? file.FileName : key);
            Directory.CreateDirectory(Path.GetDirectoryName(full)!);
            await using (var target = File.Create(full))
            {
                await file.CopyToAsync(target);
            }
            AppMetrics.FilesStored.Add(1);
            loggers.CreateLogger("Disk").LogInformation("Uploaded file {Path} ({Bytes} bytes)", Relative(full), file.Length);
            return Results.Ok(new { path = Relative(full), size = file.Length });
        }).DisableAntiforgery().WithSummary("Uploads a file to the disk.");

        disk.MapGet("/read", async (string key) =>
        {
            var file = new FileInfo(Resolve(key));
            if (file.Exists && file.Length > MaxReadBytes)
            {
                throw new BadRequestException("The file is over 1 MB. Download it instead.");
            }
            return await File.ReadAllTextAsync(file.FullName);
        }).WithSummary("Reads a file as text.");

        // Always a download, never shown inline: anyone can upload, and an uploaded HTML file must not run
        // as a page of this site.
        disk.MapGet("/download", (string key) =>
        {
            var full = Resolve(key);
            return File.Exists(full)
                ? Results.File(File.OpenRead(full), "application/octet-stream", Path.GetFileName(full))
                : throw new FileNotFoundException($"{key} does not exist.");
        }).WithSummary("Downloads a file.");

        disk.MapGet("/delete", (string key) =>
        {
            var full = Resolve(key);
            if (File.Exists(full)) File.Delete(full);
            else if (Directory.Exists(full)) Directory.Delete(full);
            else throw new FileNotFoundException($"{key} does not exist.");
            return $"deleted {Relative(full)}";
        }).WithSummary("Deletes a file, or an empty folder.");
    }
}
