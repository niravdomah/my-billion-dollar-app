using System.Net;
using Amazon.S3;
using Microsoft.AspNetCore.Diagnostics;

namespace MyBillionDollarApp;

sealed class NotConfiguredException(string message) : Exception(message);

sealed class BadRequestException(string message) : Exception(message);

static class ApiErrors
{
    // Every failure answers { error: "<message>" }, so the frontend can show what went wrong. This is a
    // connectivity demo: the message (a refused login, a missing variable) is the point of the page.
    public static void UseApiErrors(this WebApplication app) =>
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
            context.Response.StatusCode = exception switch
            {
                NotConfiguredException => StatusCodes.Status503ServiceUnavailable,
                BadRequestException or BadHttpRequestException => StatusCodes.Status400BadRequest,
                FileNotFoundException or DirectoryNotFoundException => StatusCodes.Status404NotFound,
                AmazonS3Exception { StatusCode: HttpStatusCode.NotFound } => StatusCodes.Status404NotFound,
                _ => StatusCodes.Status500InternalServerError,
            };
            await context.Response.WriteAsJsonAsync(new { error = exception?.Message ?? "Unexpected error." });
        }));
}
