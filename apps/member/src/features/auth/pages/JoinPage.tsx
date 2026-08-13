import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { ROUTES } from '@/constants';
import { ApiError, networkApi } from '@/services';
import type { InvitePreview } from '@superdreams/api-client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardTitle,
  FormField,
  Input,
  PasswordInput,
} from '@superdreams/ui';

const joinSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required.'),
    lastName: z.string().min(1, 'Last name is required.'),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
type JoinValues = z.infer<typeof joinSchema>;

const roleLabel = (role: InvitePreview['role']): string =>
  role === 'PARTNER' ? 'Partner' : 'Member';

/** Human wording for why a non-PENDING invite can no longer be used. */
const invalidReason = (status: InvitePreview['status']): string => {
  switch (status) {
    case 'USED':
      return 'This invitation has already been used.';
    case 'EXPIRED':
      return 'This invitation has expired.';
    case 'REVOKED':
      return 'This invitation has been revoked.';
    default:
      return 'This invitation is no longer valid.';
  }
};

/**
 * Invitation-based onboarding (M1c). Reads the secure invite `?code=`, previews it
 * (role / status / validity) via the public preview endpoint, and — for a valid
 * invite — creates an immediately-active account via POST
 * /api/v1/invites/:code/register. No email verification is required, because the
 * admin-issued invite is the activation credential. Public self-registration (the
 * Sign up page) is a separate, unchanged, email-verified flow.
 */
export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [formError, setFormError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [previewState, setPreviewState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Preview the invitation so the join page can show its role + validity before
  // the (unauthenticated) invitee fills the form.
  useEffect(() => {
    if (!code) {
      return;
    }
    let active = true;
    setPreviewState('loading');
    networkApi
      .previewInvite(code)
      .then((result) => {
        if (active) {
          setPreview(result);
          setPreviewState('ready');
        }
      })
      .catch(() => {
        if (active) {
          setPreviewState('error');
        }
      });
    return () => {
      active = false;
    };
  }, [code]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<JoinValues>({
    resolver: zodResolver(joinSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: JoinValues): Promise<void> => {
    if (!code) {
      return;
    }
    setFormError(null);
    try {
      // The invite code comes from the link only; the member never edits it, and
      // we never send referredBy/partnerId from the frontend — the invite carries
      // the Partner/role relationship server-side.
      await networkApi.registerWithInvite(code, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      setJoined(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Could not complete your invitation. Please try again.',
      );
    }
  };

  let body: JSX.Element;
  if (!code) {
    body = (
      <div className="space-y-4 text-center">
        <CardTitle className="text-2xl">Invitation link incomplete</CardTitle>
        <p className="text-sm text-muted-foreground">
          This invitation link is missing its code. Please use the exact link you were given, or ask
          your administrator for a new invitation.
        </p>
        <Button fullWidth variant="outline" onClick={() => navigate(ROUTES.login)}>
          Back to sign in
        </Button>
      </div>
    );
  } else if (joined) {
    body = (
      <div className="space-y-4 text-center">
        <CardTitle className="text-2xl">You&rsquo;re all set</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your account is active. Sign in to get started.
        </p>
        <Button fullWidth onClick={() => navigate(ROUTES.login)}>
          Go to sign in
        </Button>
      </div>
    );
  } else if (previewState === 'loading') {
    body = (
      <p className="py-4 text-center text-sm text-muted-foreground">Checking your invitation…</p>
    );
  } else if (previewState === 'error') {
    body = (
      <div className="space-y-4 text-center">
        <CardTitle className="text-2xl">Invitation not found</CardTitle>
        <p className="text-sm text-muted-foreground">
          This invitation link is invalid or has been removed. Please ask your administrator for a
          new invitation.
        </p>
        <Button fullWidth variant="outline" onClick={() => navigate(ROUTES.login)}>
          Back to sign in
        </Button>
      </div>
    );
  } else if (preview && !preview.valid) {
    body = (
      <div className="space-y-4 text-center">
        <CardTitle className="text-2xl">Invitation no longer valid</CardTitle>
        <p className="text-sm text-muted-foreground">{invalidReason(preview.status)}</p>
        <Button fullWidth variant="outline" onClick={() => navigate(ROUTES.login)}>
          Back to sign in
        </Button>
      </div>
    );
  } else {
    const label = preview ? roleLabel(preview.role) : 'Member';
    body = (
      <>
        <div className="space-y-1 text-center">
          <CardTitle className="text-2xl">Accept your {label} invitation</CardTitle>
          <p className="text-sm text-muted-foreground">Create your account to join Super Dreams.</p>
        </div>

        <Alert variant="success" title={`You've been invited to join as a ${label}`}>
          Your account will be activated immediately — no email confirmation needed.
        </Alert>

        {formError ? (
          <Alert variant="destructive" title="Unable to accept invitation">
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
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name" required error={errors.firstName?.message}>
              <Input autoComplete="given-name" {...register('firstName')} />
            </FormField>
            <FormField label="Last name" required error={errors.lastName?.message}>
              <Input autoComplete="family-name" {...register('lastName')} />
            </FormField>
          </div>
          <FormField label="Email" required error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register('email')} />
          </FormField>
          <FormField label="Password" required error={errors.password?.message}>
            <PasswordInput autoComplete="new-password" {...register('password')} />
          </FormField>
          <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
          </FormField>
          <Button type="submit" fullWidth isLoading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Accept invitation — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">{body}</CardContent>
        </Card>
      </main>
    </>
  );
}
