import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { Icon, type IconName } from '@superdreams/ui';

export interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
  icon: IconName;
}

/** Shared full-page error state (401/403/404/500). Design-system consistent. */
export function ErrorPage({ code, title, description, icon }: ErrorPageProps) {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Helmet>
        <title>{`${code} — ${title}`}</title>
      </Helmet>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name={icon} size="lg" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{code}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <Link
        to={ROUTES.dashboard}
        className="mt-2 inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-medium text-primary-foreground [background-image:var(--btn-primary-image)] transition duration-150 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:active:scale-[var(--press-scale)] active:brightness-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
