# Real User Monitoring (RUM) Application

Real User Monitoring (RUM) captures real-user frontend performance and behavioral telemetry and stores it for analysis in a dashboard.

**Projects included**
- **rum-api** — Backend ingestion and analytics API (ASP.NET Core, EF Core, PostgreSQL).
- **rum-dashboard** — Angular-based dashboard and UI for visualizing telemetry.
- **rum-sdk** — TypeScript SDK / client library to collect and send telemetry from web apps.

**Quick overview & run instructions**

- **rum-api**: Backend API
	- Location: [rum-api](rum-api)
	- Tech: .NET 10, EF Core, Npgsql (PostgreSQL provider). See [rum-api/rum-api.csproj](rum-api/rum-api.csproj#L1-L15) and [rum-api/Program.cs](rum-api/Program.cs#L1-L40).
	- Notes: The app will auto-create the database and seed a test application when started. Default connection string is in `Program.cs` (uses `Host=localhost;Database=rum_db;Username=postgres;Password=postgres;Port=5432`).
	- Run locally:

```bash
cd rum-api
dotnet restore
dotnet build
dotnet run
```

- **rum-dashboard**: Angular UI
	- Location: [rum-dashboard](rum-dashboard)
	- Tech: Angular 21 (see [rum-dashboard/package.json](rum-dashboard/package.json#L1-L30)).
	- Common scripts: `npm start` (dev server), `npm run build` (production build), `npm test`.
	- Run locally:

```bash
cd rum-dashboard
npm install
npm start
```

- **rum-sdk**: TypeScript SDK
	- Location: [rum-sdk](rum-sdk)
	- Tech: TypeScript library (see [rum-sdk/package.json](rum-sdk/package.json#L1-L30)).
	- Build:

```bash
cd rum-sdk
npm install
npm run build
```

**Developer**
- Ravi Sen

If you'd like, I can also add more detailed setup steps (PostgreSQL example, Docker compose, or CI scripts). 