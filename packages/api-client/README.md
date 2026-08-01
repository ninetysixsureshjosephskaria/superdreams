# @superdreams/api-client

A reusable, typed **Axios** client factory with platform error normalization.
Applications build their service modules on this; components never call it (or
`fetch`) directly. Contains **no business endpoints**.

## Public API

```ts
import { createApiClient, ApiError, normalizeError } from '@superdreams/api-client';
import type { ApiClientConfig } from '@superdreams/api-client';

const apiClient = createApiClient({ baseURL: 'http://localhost:3000' });
```

- `createApiClient(config)` — configured Axios instance (base URL, timeout,
  headers) with request/response interceptors; failures reject with `ApiError`.
- `ApiError` — normalized, typed error (`code`, `status?`, `details?`, `traceId?`).
- `normalizeError(unknown)` — converts any thrown value to an `ApiError`.

## Folder Structure

```text
src/
├── client.ts   # createApiClient factory + interceptors
├── errors.ts   # ApiError + normalizeError
└── index.ts    # Public exports
```

## Development

`pnpm --filter @superdreams/api-client test | lint | typecheck`.
