import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { ROUTES } from '@/constants';
import { ApiError, authApi } from '@/services';
import { useNotificationStore, useSessionStore } from '@/store';
import { Alert, Button, ContentCard, FormField, PasswordInput } from '@superdreams/ui';
import { passwordSchema } from '@superdreams/validation';

/**
 * Password change for the currently authenticated admin. Uses the same policy
 * (`passwordSchema`) and endpoint (`POST /api/v1/auth/change-password`) as the
 * member-facing flow — no password logic is duplicated here, and hashes are
 * never exposed. On success the server revokes every session, so we clear the
 * local session and send the operator back to the login screen.
 */
const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Your current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from your current one.',
  });
type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

export function ChangePasswordCard(): JSX.Element {
  const navigate = useNavigate();
  const notify = useNotificationStore((state) => state.notify);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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
      reset();
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
    <ContentCard
      title="Password"
      description="Change the password for your admin account. Signs you out on all devices."
    >
      {formError ? (
        <Alert variant="destructive" title="Unable to change password" className="mb-4">
          {formError}
        </Alert>
      ) : null}

      <form
        noValidate
        className="max-w-md space-y-4"
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
        <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" isLoading={isSubmitting}>
          Update password
        </Button>
      </form>
    </ContentCard>
  );
}
