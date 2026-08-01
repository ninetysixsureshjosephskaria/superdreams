import { ErrorPage } from '@/pages/errors/ErrorPage';

/** 404 — catch-all not-found page rendered within the public layout. */
export default function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page not found"
      description="The page you are looking for does not exist or has moved."
      icon="search"
    />
  );
}
