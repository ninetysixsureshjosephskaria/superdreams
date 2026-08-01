import { useSessionStore } from '@/store';
import { Badge } from '@superdreams/ui';

/** Member dashboard welcome banner. Greets the (mock) current member. */
export function WelcomeBanner() {
  const user = useSessionStore((state) => state.user);
  const firstName = (user?.name ?? 'there').split(' ')[0];

  return (
    <div className="rounded-lg border bg-gradient-to-r from-primary/10 to-transparent p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Hi {firstName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back to your member portal.</p>
        </div>
        {user?.tier ? <Badge variant="warning">{user.tier} member</Badge> : null}
      </div>
    </div>
  );
}
