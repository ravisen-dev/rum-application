# rum-dashboard

Angular dashboard application for the RUM solution.

## Purpose

This project visualizes telemetry collected by `rum-api` and sent from `rum-sdk`-enabled client applications.

## Run locally

```bash
cd rum-dashboard
npm install
npm start
```

Then open `http://localhost:4200` in your browser.

## Build

```bash
cd rum-dashboard
npm run build
```

The production bundle is written to `dist/`.

## Test

```bash
cd rum-dashboard
npm test
```

## Notes

- The dashboard calls the backend API at `http://localhost:5000`.
- The backend must be running before the dashboard can load application telemetry.
- The app uses Angular 21 and `@angular/build`.
