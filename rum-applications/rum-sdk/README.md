# rum-sdk

TypeScript SDK package for the Real User Monitoring solution.

## Overview

`rum-sdk` is a reusable client library that collects telemetry and sends it to the `rum-api` backend.

## Build

```bash
cd rum-sdk
npm install
npm run build
```

## Usage

- The package output is produced in `dist/`.
- `rum-sdk-todos` consumes this package locally via `@rum-app/sdk`.
- Update the SDK initialization endpoint in the sample app if you need to point to a different backend URL.

## Notes

- This package is configured for TypeScript compilation using `tsconfig.json`.
- Publish or package it as needed for reuse in other web applications.
