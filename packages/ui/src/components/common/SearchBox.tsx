import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';

export interface SearchBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Shows a clear button that invokes this handler. */
  onClear?: () => void;
}

/** Search input with a leading icon and optional clear affordance. */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
  { className, onClear, placeholder = 'Search…', ...props },
  ref,
) {
  return (
    <div className="relative">
      <Icon
        name="search"
        size="sm"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...props}
      />
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-0 top-0 flex h-10 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="x" size="sm" />
        </button>
      ) : null}
    </div>
  );
});
