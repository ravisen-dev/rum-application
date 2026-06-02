# rum-api

Backend ingestion API for the RUM solution.

## Overview

`rum-api` is an ASP.NET Core Minimal API that ingests telemetry from client applications and stores it in PostgreSQL.

The backend automatically creates the database and tables on startup and seeds a default application if none exist.

## Key endpoints

- `GET /` — health check
- `GET /api/applications` — list registered applications
- `POST /api/applications` — create a new application
- `POST /api/telemetry/ingest` — ingest telemetry batches from the SDK

## Default settings

- Default database connection string:
  `Host=localhost;Database=rum_db;Username=postgres;Password=postgres;Port=5432`
- Default backend URL for local development: `http://localhost:5000`
- Allowed CORS origins: `http://localhost:4200`, `http://localhost:4201`

## Run locally

```bash
cd rum-api
dotnet restore
dotnet build
dotnet run --urls http://localhost:5000
```

## Notes

- Ensure PostgreSQL is running locally before starting the API.
- You can change the connection string in `Program.cs` or use a configuration source as needed.
