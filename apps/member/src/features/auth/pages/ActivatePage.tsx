import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import { Alert, Button, Card, CardContent, CardTitle, LoadingScreen } from '@superdreams/ui';

type Status = 'pending' | 'success' | 'error';

/** Account activation. Consumes the emailed token: POST /api/v1/auth/verify-email. */
export default function ActivatePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState<string>('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setStatus('error');
      setMessage('This activation link is missing its token.');
      return;
    }
    void authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((error: unknown) => {
        setStatus('error');
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'This activation link is invalid or has expired.',
        );
      });
  }, [token]);

  if (status === 'pending') {
    return <LoadingScreen message="Activating your account…" />;
  }

  return (
    <>
      <Helmet>
        <title>Activate account — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6 text-center">
            {status === 'success' ? (
              <>
                <CardTitle className="text-2xl">Account activated</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your email is verified. You can now sign in to your account.
                </p>
                <Button fullWidth onClick={() => navigate(ROUTES.login)}>
                  Sign in
                </Button>
              </>
            ) : (
              <>
                <CardTitle className="text-2xl">Activation failed</CardTitle>
                <Alert variant="destructive" title="Could not activate">
                  {message}
                </Alert>
                <p className="text-sm text-muted-foreground">
                  The link may have expired. Request a new activation email from the sign-in page.
                </p>
                <Button fullWidth variant="secondary" onClick={() => navigate(ROUTES.login)}>
                  Back to sign in
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
