# @superdreams/types

Shared TypeScript **contracts** for the Super Dreams platform: the canonical API
response envelope, pagination shapes, theme types, and small runtime type guards.
No business implementation — shared contracts only.

## Public API

```ts
import type {
    ApiResponse,
    SuccessResponse,
    ErrorResponse,
    ErrorDetail,
    NormalizedError,
    ResponseMeta,
    PaginationParams,
    PaginationMeta,
    Paginated,
    ThemeMode,
    ResolvedTheme,
} from '@superdreams/types';
import { isSuccessResponse, isErrorResponse } from '@superdreams/types';
```

## Folder Structure

```text
src/
├── api.ts         # Response envelope + normalized error
├── pagination.ts  # Generic pagination contracts
├── theme.ts       # Theme mode types
├── guards.ts      # Runtime type guards
└── index.ts       # Public exports
```

## Development

`pnpm --filter @superdreams/types test | lint | typecheck`.
