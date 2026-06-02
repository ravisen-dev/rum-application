# rum-sdk-todos

Angular sample application that demonstrates using the local `rum-sdk` package to send Real User Monitoring telemetry to the `rum-api` backend.

## Purpose

This app demonstrates:

- registering an application with the RUM backend
- sending page view telemetry via `rum-sdk`
- sending custom event telemetry for todo interactions
- posting telemetry to `rum-api` at `http://localhost:5000/api/telemetry/ingest`

## Run locally

```bash
cd rum-sdk-todos
npm install
npm start
```

Then open `http://localhost:4201` in your browser.

## Notes

- The app uses the local SDK package from `../rum-sdk` via `@rum-app/sdk`.
- The sample app is configured to communicate with the backend at `http://localhost:5000`.
- Ensure `rum-api` is running before starting this app.
