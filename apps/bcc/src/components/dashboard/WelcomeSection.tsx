import { useSessionStore } from '@/store';

/** Dashboard welcome banner. Greets the current user. */
export function WelcomeSection() {
  const user = useSessionStore((state) => state.user);
  const firstName = (user?.name ?? 'there').split(' ')[0];

  return (
    <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-transparent p-6">
      <h2 className="text-xl font-semibold tracking-tight">Welcome back, {firstName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Here is a live snapshot of the platform.</p>
    </div>
  );
}
