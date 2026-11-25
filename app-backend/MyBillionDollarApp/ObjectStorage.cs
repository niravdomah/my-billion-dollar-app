using Amazon.S3;
using Amazon.S3.Model;

namespace MyBillionDollarApp;

static class ObjectStorage
{
    private const string Alternative = "S3_ENDPOINT_URL";

    // The Linx Portal's object stores address buckets path-style only, so ForcePathStyle cannot be dropped.
    private static AmazonS3Client Client() => new(
        Env.Require("S3_ACCESS_KEY", Alternative),
        Env.Require("S3_SECRET_KEY", Alternative),
        new AmazonS3Config
        {
            ServiceURL = Env.Get("S3_ENDPOINT_URL") ?? throw new NotConfiguredException("S3_ENDPOINT_URL is not set."),
            ForcePathStyle = true,
            AuthenticationRegion = "us-east-1",
        });

    private static string Bucket() =>
        Env.Get("S3_BUCKET_NAME") ?? throw new NotConfiguredException("S3_BUCKET_NAME is not set.");

    private static string RequireKey(string? key) =>
        string.IsNullOrWhiteSpace(key) ? throw new BadRequestException("Enter a key first.") : key.Trim();

    public static void MapObjectStorage(this WebApplication app)
    {
        var s3 = app.MapGroup("/s3").WithTags("Object storage");

        s3.MapGet("/config", () => new
        {
            configured = Env.Get("S3_ENDPOINT_URL") is not null && Env.Get("S3_BUCKET_NAME") is not null,
            endpoint = Env.Get("S3_ENDPOINT_URL"),
            bucket = Env.Get("S3_BUCKET_NAME"),
            accessKey = Env.Get("S3_ACCESS_KEY"),
            secretKeySet = Env.Get("S3_SECRET_KEY") is not null,
        }).WithSummary("Shows the bucket settings without connecting.");

        s3.MapGet("/list", async (string? prefix) =>
        {
            using var client = Client();
            var response = await client.ListObjectsV2Async(new ListObjectsV2Request
            {
                BucketName = Bucket(),
                Prefix = prefix,
            });
            return (response.S3Objects ?? []).Select(o => new { key = o.Key, size = o.Size, lastModified = o.LastModified });
        }).WithSummary("Lists the objects in the bucket (the first 1,000).");

        s3.MapGet("/write", async (string key, string value, ILoggerFactory loggers) =>
        {
            key = RequireKey(key);
            using var client = Client();
            await client.PutObjectAsync(new PutObjectRequest { BucketName = Bucket(), Key = key, ContentBody = value });
            AppMetrics.FilesStored.Add(1);
            loggers.CreateLogger("ObjectStorage").LogInformation("Wrote object {Key}", key);
            return $"wrote {Bucket()}/{key}";
        }).WithSummary("Writes a text object.");

        s3.MapPost("/upload", async (IFormFile file, [Microsoft.AspNetCore.Mvc.FromForm] string? key, ILoggerFactory loggers) =>
        {
            key = string.IsNullOrWhiteSpace(key) ? file.FileName : key.Trim();
            using var client = Client();
            await using var content = file.OpenReadStream();
            await client.PutObjectAsync(new PutObjectRequest
            {
                BucketName = Bucket(),
                Key = key,
                InputStream = content,
                ContentType = file.ContentType,
            });
            AppMetrics.FilesStored.Add(1);
            loggers.CreateLogger("ObjectStorage").LogInformation("Uploaded object {Key} ({Bytes} bytes)", key, file.Length);
            return Results.Ok(new { key, size = file.Length });
        }).DisableAntiforgery().WithSummary("Uploads a file as an object.");

        s3.MapGet("/read", async (string key) =>
        {
            using var client = Client();
            using var response = await client.GetObjectAsync(Bucket(), RequireKey(key));
            using var reader = new StreamReader(response.ResponseStream);
            return await reader.ReadToEndAsync();
        }).WithSummary("Reads an object as text.");

        // Always a download, never shown inline: anyone can upload, and an uploaded HTML file must not run
        // as a page of this site.
        s3.MapGet("/download", async (string key) =>
        {
            key = RequireKey(key);
            using var client = Client();
            var response = await client.GetObjectAsync(Bucket(), key);
            return Results.File(response.ResponseStream, "application/octet-stream", Path.GetFileName(key));
        }).WithSummary("Downloads an object.");

        s3.MapGet("/delete", async (string key) =>
        {
            key = RequireKey(key);
            using var client = Client();
            await client.DeleteObjectAsync(Bucket(), key);
            return $"deleted {key}";
        }).WithSummary("Deletes an object.");
    }
}
