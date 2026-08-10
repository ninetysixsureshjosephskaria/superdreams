import { useSessionStore } from '@/store';

/** Dashboard welcome banner. Greets the current user. */
export function WelcomeSection() {
  const user = useSessionStore((state) => state.user);
  const firstName = (user?.name ?? 'there').split(' ')[0];

  return (
    <section className="overflow-hidden rounded-card border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-7">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
        Business Control Center
      </p>
      <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-[1.6rem]">
        Welcome back, {firstName}
      </h2>
      <p className="mt-1.5 text-sm font-medium text-muted-foreground">
        Here is a live snapshot of the platform.
      </p>
    </section>
  );
}
