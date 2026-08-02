import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import { useNotificationStore, useSessionStore } from '@/store';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardTitle,
  FormField,
  PasswordInput,
} from '@superdreams/ui';

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Your current password is required.'),
    newPassword: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

/** Forced/self-service password change. Connects to POST /api/v1/auth/change-password. */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const mustChange = useSessionStore((state) => state.user?.mustChangePassword ?? false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ChangePasswordFormValues): Promise<void> => {
    setFormError(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      // The server revokes all sessions on change — sign in again with the new password.
      useSessionStore.getState().clear();
      notify({
        variant: 'success',
        title: 'Password updated',
        description: 'Please sign in with your new password.',
      });
      navigate(ROUTES.login, { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not change your password.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Change password — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-1 text-center">
              <CardTitle className="text-2xl">Change your password</CardTitle>
              <p className="text-sm text-muted-foreground">
                {mustChange
                  ? 'For your security, set a new password before continuing.'
                  : 'Update the password for your account.'}
              </p>
            </div>

            {formError ? (
              <Alert variant="destructive" title="Unable to change password">
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
              <FormField label="Current password" required error={errors.currentPassword?.message}>
                <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
              </FormField>
              <FormField label="New password" required error={errors.newPassword?.message}>
                <PasswordInput autoComplete="new-password" {...register('newPassword')} />
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
          </CardContent>
        </Card>
      </main>
    </>
  );
}
