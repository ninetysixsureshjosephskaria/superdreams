import { SearchBox } from '@superdreams/ui';

/** Global search bar — UI only in this phase (no query logic or API). */
export function GlobalSearch() {
  return (
    <form
      role="search"
      className="w-full max-w-md"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <SearchBox aria-label="Global search" placeholder="Search members, campaigns…" />
    </form>
  );
}
