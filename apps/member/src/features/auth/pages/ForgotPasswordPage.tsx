import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import { Alert, Button, Card, CardContent, CardTitle, FormField, Input } from '@superdreams/ui';

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
});
type Values = z.infer<typeof schema>;

/** Request a password reset. Connects to POST /api/v1/auth/forgot-password. */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async (values: Values): Promise<void> => {
    setFormError(null);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong. Try again.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot password — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">
            {sent ? (
              <div className="space-y-4 text-center">
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <p className="text-sm text-muted-foreground">
                  If an account exists for that email, we&rsquo;ve sent a password reset link.
                </p>
                <Button fullWidth onClick={() => navigate(ROUTES.login)}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <CardTitle className="text-2xl">Forgot your password?</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we&rsquo;ll send you a reset link.
                  </p>
                </div>

                {formError ? (
                  <Alert variant="destructive" title="Unable to send">
                    {formError}
                  </Alert>
                ) : null}

                <form
                  noValidate
                  className="space-y-4"
                  onSubmit={(event) => {
                    void handleSubmit(onSubmit)(event);
                  }}
                >
                  <FormField label="Email" required error={errors.email?.message}>
                    <Input type="email" autoComplete="email" {...register('email')} />
                  </FormField>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Send reset link
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
