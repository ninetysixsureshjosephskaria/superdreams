import { ErrorPage } from './ErrorPage';

/** 401 — authentication required. */
export default function UnauthorizedPage() {
  return (
    <ErrorPage
      code="401"
      title="Sign in required"
      description="You need to sign in to view this page. Authentication is wired in a later phase."
      icon="user"
    />
  );
}
