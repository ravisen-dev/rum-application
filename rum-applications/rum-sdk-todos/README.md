# RUM SDK Todos

A simple Angular 21 sample app that integrates with the `rum-api` backend and sends Real User Monitoring (RUM) telemetry for todo actions.

## Purpose

This app demonstrates:

- registering a monitored application with the RUM backend
- sending page view telemetry
- sending custom event telemetry for todo actions
- using the existing `rum-api` ingestion endpoint

## Project structure

- `src/app/app.component.ts` — main UI logic and telemetry integration
- `src/app/rum-api.service.ts` — RUM API client service
- `src/app/app.component.html` — todo UI
- `src/app/app.component.css` — styling

## Prerequisites

- Node.js installed
- `npm` available
- `rum-api` running on `http://localhost:5000`

## Run locally

```bash
cd rum-sdk-todos
npm install
npm start
```

Then open the app in your browser at `http://localhost:4201`.

## Notes

- The app will automatically create or reuse an application named `RUM SDK Todos` in the backend.
- Telemetry is sent to `http://localhost:5000/api/telemetry/ingest`.
- If you need the app to use a different backend URL, update `rum-api.service.ts`.
