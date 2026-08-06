import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardTitle,
  FormField,
  PasswordInput,
} from '@superdreams/ui';

const schema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
type Values = z.infer<typeof schema>;

/** Reset a password with the emailed token. Connects to POST /api/v1/auth/reset-password. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: Values): Promise<void> => {
    setFormError(null);
    if (!token) {
      setFormError('This reset link is missing its token.');
      return;
    }
    try {
      await authApi.resetPassword(token, values.password);
      setDone(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'This reset link is invalid or has expired.',
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset password — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">
            {done ? (
              <div className="space-y-4 text-center">
                <CardTitle className="text-2xl">Password updated</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your password has been reset. Please sign in with your new password.
                </p>
                <Button fullWidth onClick={() => navigate(ROUTES.login)}>
                  Sign in
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <CardTitle className="text-2xl">Set a new password</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose a new password for your account.
                  </p>
                </div>

                {formError ? (
                  <Alert variant="destructive" title="Unable to reset password">
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
                  <FormField label="New password" required error={errors.password?.message}>
                    <PasswordInput autoComplete="new-password" {...register('password')} />
                  </FormField>
                  <FormField
                    label="Confirm new password"
                    required
                    error={errors.confirmPassword?.message}
                  >
                    <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
                  </FormField>
                  <Button type="submit" fullWidth isLoading={isSubmitting}>
                    Update password
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
