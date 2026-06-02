# Real User Monitoring (RUM) Application

This workspace contains a full Real User Monitoring solution with backend ingestion, frontend dashboard, SDK client, and a sample Angular application.

## Projects included

- **rum-api** — Backend ingestion and analytics API (ASP.NET Core Minimal API, EF Core, PostgreSQL).
- **rum-dashboard** — Angular dashboard for visualizing application telemetry.
- **rum-sdk** — TypeScript SDK package for collecting and sending telemetry from web apps.
- **rum-sdk-todos** — Angular sample app that uses the SDK and sends telemetry to the backend.

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) and `npm`
- [PostgreSQL](https://www.postgresql.org/) running locally (default connection uses `Host=localhost;Port=5432;Username=postgres;Password=postgres`)

## Run the solution locally

1. Start the backend API

```bash
cd rum-api
dotnet restore
dotnet build
dotnet run --urls http://localhost:5000
```

The backend will auto-create the database and seed a default application if needed.

2. Build the SDK package

```bash
cd rum-sdk
npm install
npm run build
```

3. Start the dashboard

```bash
cd rum-dashboard
npm install
npm start
```

Open the dashboard at `http://localhost:4200`.

4. Start the sample todo app

```bash
cd rum-sdk-todos
npm install
npm start
```

Open the sample app at `http://localhost:4201`.

## Notes

- The dashboard and sample app are configured to communicate with the backend at `http://localhost:5000`.
- `rum-sdk-todos` depends on the local SDK package in `rum-sdk` via `file:../rum-sdk`.
- The backend supports CORS for `http://localhost:4200` and `http://localhost:4201`.

## Project locations

- `rum-api` — backend service and telemetry ingestion endpoints
- `rum-dashboard` — Angular UI for application and telemetry visualization
- `rum-sdk` — reusable TypeScript SDK package
- `rum-sdk-todos` — Angular sample client integration
 
