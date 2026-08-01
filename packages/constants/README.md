# @superdreams/constants

Shared, platform-wide constants — no business logic and no application-specific
values (app routes and query keys stay in each app).

## Public API

```ts
import {
    STORAGE_NAMESPACE,
    storageKey,
    API,
    PAGINATION,
    REGEX,
    DATE_FORMATS,
} from '@superdreams/constants';
```

## Development

`pnpm --filter @superdreams/constants test | lint | typecheck`.
