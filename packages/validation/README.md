# @superdreams/validation

Reusable **Zod** validation schemas shared across the platform. Define a rule
once; reuse it everywhere (forms, API inputs).

## Public API

```ts
import {
    emailSchema,
    passwordSchema,
    uuidSchema,
    phoneSchema,
    paginationSchema,
    searchSchema,
} from '@superdreams/validation';
import type { PaginationInput, SearchInput } from '@superdreams/validation';
```

## Development

`pnpm --filter @superdreams/validation test | lint | typecheck`.
