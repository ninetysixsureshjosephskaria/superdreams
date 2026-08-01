# @superdreams/utils

Pure, framework-independent utility functions. **No React** and **no business
logic** — safe to use from any app, package, or backend service.

## Public API

```ts
import {
    cn, // conditional class-name join
    debounce,
    throttle,
    sleep,
    isDefined,
    capitalize,
    truncate,
    formatCurrency,
    formatDate,
} from '@superdreams/utils';
```

## Folder Structure

```text
src/
├── cn.ts        # Conditional class-name composition
├── function.ts  # debounce / throttle / sleep
├── lang.ts      # isDefined / capitalize / truncate
├── format.ts    # formatCurrency / formatDate (Intl)
└── index.ts     # Public exports
```

## Development

`pnpm --filter @superdreams/utils test | lint | typecheck`.
