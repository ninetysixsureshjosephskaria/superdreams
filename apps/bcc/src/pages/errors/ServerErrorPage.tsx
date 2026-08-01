import { ErrorPage } from './ErrorPage';

/** 500 — unexpected error. */
export default function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Something went wrong"
      description="An unexpected error occurred. Please try again."
      icon="alert-triangle"
    />
  );
}
