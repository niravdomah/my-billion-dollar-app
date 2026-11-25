# My Billion Dollar App

A demo app for the Linx Portal: a Next.js frontend and a .NET backend in one repository, laid out the way
Stadium Builder lays out an app. Each half is its own application in the Portal.

| Folder | What it is | Port |
| --- | --- | --- |
| `app-backend/MyBillionDollarApp` | .NET 10 minimal API with a Swagger page at `/swagger` | 8042 |
| `app-frontend` | Next.js 16 app (TypeScript, Tailwind) | 3000 |

The frontend never calls the backend from the browser. Every API call goes to the frontend's own
`/api/backend/...` route, which passes it on to the backend at `SETTING__BackendUrl`. In the Portal that is the
backend instance's **internal address**, so the two talk to each other inside their environment.

The pages exercise what the Portal provides:

- **PostgreSQL** and **SQL Server**: connection details, a `portal_check` notes table (create, add, read, drop),
  and a box that runs any SQL.
- **Object storage**: list, write, upload, read, download and delete objects in a bucket.
- **Home**: the backend address and whether it answers, and the `MY_ENV` / `MY_SECRET_ENV` settings (the
  secret's value is never shown).

> The SQL boxes run anything they're given, as the configured login, and none of the pages ask anyone to sign
> in. Anyone with the frontend's or the backend's public URL can read or change the demo's data.

## Run it locally

Requires the .NET 10 SDK and Node.js 24 or later.

```bash
dotnet run --project app-backend/MyBillionDollarApp      # http://localhost:8042
cd app-frontend && npm install && npm run dev            # http://localhost:3000
```

Set the backend variables below in your shell to connect it to a database or bucket. To run the
backend on another port, set `PORT`, and point the frontend at it with `SETTING__BackendUrl` in
`app-frontend/.env.local`.

## Set it up in the Linx Portal

1. Create the **backend** application from this repository with the subdirectory
   `app-backend/MyBillionDollarApp`, and the **frontend** application with the subdirectory `app-frontend`.
   Each reads the `linx-app.yml` in its own folder.
2. Build both, and create an instance of each in the same environment.
3. On the backend instance, map the variables for whatever you want to show (below), and make it public if you
   want its Swagger page reachable.
4. On the frontend instance, set `SETTING__BackendUrl` to the backend instance's internal address, copied from
   the backend instance's page (on a Kubernetes region it reads like `linx-demo--dev--backend:8042`; `http://`
   is added when it's missing), and make it public.

Both apps send their own metrics and logs to the Portal over OpenTelemetry, using the endpoint the Portal
injects. Nothing needs configuring. Metrics are exported every 15 seconds:

- Backend: `api_requests_total`, `notes_written_total`, `sql_queries_total`, `files_stored_total`.
- Frontend: `backend_calls_total`, `backend_call_failures_total`.

## Backend variables

All are optional: a page whose service isn't configured says so.

| Variable | Use |
| --- | --- |
| `MY_ENV`, `MY_SECRET_ENV` | Shown on the Home page (the secret only as set / not set and its length) |
| `PG_CONNECTION_STRING` | A PostgreSQL database's connection string, used exactly as given |
| `MSSQL_CONNECTION_STRING` | A SQL Server database's connection string, used exactly as given |
| `S3_ENDPOINT_URL`, `S3_BUCKET_NAME`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | The bucket (path-style addressing) |
| `PORT` | The port to listen on (default 8042) |

## Frontend variables

| Variable | Use |
| --- | --- |
| `SETTING__BackendUrl` | The backend's address, with or without `http://` (default `http://localhost:8042`) |
| `PORT` | The port to listen on (default 3000) |
