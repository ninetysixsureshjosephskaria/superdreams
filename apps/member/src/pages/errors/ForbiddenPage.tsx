import { ErrorPage } from './ErrorPage';

/** 403 — access denied. */
export default function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Access denied"
      description="You do not have permission to view this page."
      icon="shield"
    />
  );
}
