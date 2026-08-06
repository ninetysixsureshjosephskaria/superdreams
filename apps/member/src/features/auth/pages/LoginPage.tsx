import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import { z } from 'zod';

import { useAuth } from '@/auth';
import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import { useSessionStore } from '@/store';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardTitle,
  Checkbox,
  FormField,
  Input,
  PasswordInput,
} from '@superdreams/ui';

const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});
type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LocationState {
  from?: string;
}

/** Member Portal sign-in. Connects to POST /api/v1/auth/login. */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated);
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const from = (location.state as LocationState | null)?.from ?? ROUTES.home;

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setFormError(null);
    setUnverifiedEmail(null);
    setResendMessage(null);
    try {
      const user = await login({
        email: values.email,
        password: values.password,
        rememberMe: values.rememberMe ?? false,
      });
      if (user.mustChangePassword) {
        navigate(ROUTES.changePassword, { replace: true });
        return;
      }
      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Sign in failed. Please try again.';
      setFormError(message);
      // Offer to re-send the activation email when the account isn't verified yet.
      if (/verify your email/i.test(message)) {
        setUnverifiedEmail(values.email);
      }
    }
  };

  const resendActivation = async (): Promise<void> => {
    if (!unverifiedEmail) return;
    setResendMessage(null);
    try {
      await authApi.resendVerification(unverifiedEmail);
    } finally {
      // Response is intentionally non-committal (never discloses account existence).
      setResendMessage(
        'If the account exists and is unverified, a new activation email is on its way.',
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign in — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-1 text-center">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sign in to your Super Dreams member account.
              </p>
            </div>

            {formError ? (
              <Alert variant="destructive" title="Unable to sign in">
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
              <FormField label="Password" required error={errors.password?.message}>
                <PasswordInput autoComplete="current-password" {...register('password')} />
              </FormField>
              <Checkbox label="Remember me" {...register('rememberMe')} />
              <Button type="submit" fullWidth isLoading={isSubmitting}>
                Sign in
              </Button>
            </form>

            {unverifiedEmail ? (
              <div className="space-y-2 rounded-input border border-border bg-muted/30 p-3 text-center">
                {resendMessage ? (
                  <p className="text-sm text-muted-foreground">{resendMessage}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your account isn&rsquo;t activated yet.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void resendActivation();
                      }}
                    >
                      Resend activation email
                    </Button>
                  </>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <Link to={ROUTES.forgotPassword} className="font-medium text-primary hover:underline">
                Forgot password?
              </Link>
              <span className="text-muted-foreground">
                New here?{' '}
                <Link to={ROUTES.signup} className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
