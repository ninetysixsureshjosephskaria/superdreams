import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Input,
  PasswordInput,
} from '@superdreams/ui';

const signUpSchema = z
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
type SignUpValues = z.infer<typeof signUpSchema>;

/** sessionStorage key that survives a refresh/nav so `?ref=` is not lost. */
const REF_STORAGE_KEY = 'sd:ref';

/** Member sign-up. Connects to POST /api/v1/auth/register. */
export default function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  // Effective referral code = URL `?ref=` first, else a previously persisted one.
  const urlRef = searchParams.get('ref');
  const [referralCode, setReferralCode] = useState<string | null>(
    () => urlRef ?? sessionStorage.getItem(REF_STORAGE_KEY),
  );

  // Persist a code arriving via the URL so a refresh or navigation keeps it.
  useEffect(() => {
    if (urlRef) {
      sessionStorage.setItem(REF_STORAGE_KEY, urlRef);
      setReferralCode(urlRef);
    }
  }, [urlRef]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignUpValues): Promise<void> => {
    setFormError(null);
    try {
      const result = await authApi.register({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        // The referral code is captured from the link only; the member never
        // edits it and we never send referredBy/partnerId from the frontend.
        ...(referralCode ? { referralCode } : {}),
      });
      sessionStorage.removeItem(REF_STORAGE_KEY);
      setCreatedEmail(result.email);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Could not create your account. Please try again.',
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign up — Super Dreams</title>
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-6 pt-6">
            {createdEmail ? (
              <div className="space-y-4 text-center">
                <CardTitle className="text-2xl">Check your email</CardTitle>
                <p className="text-sm text-muted-foreground">
                  We&rsquo;ve sent an activation link to <strong>{createdEmail}</strong>. Click it
                  to activate your account, then sign in.
                </p>
                <Button fullWidth onClick={() => navigate(ROUTES.login)}>
                  Back to sign in
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1 text-center">
                  <CardTitle className="text-2xl">Create your account</CardTitle>
                  <p className="text-sm text-muted-foreground">Join Super Dreams in a minute.</p>
                </div>

                {referralCode ? (
                  <Alert variant="success" title="You're joining via a referral invitation">
                    Your account will be linked to the member who invited you.
                  </Alert>
                ) : null}

                {formError ? (
                  <Alert variant="destructive" title="Unable to sign up">
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
                  <FormField
                    label="Confirm password"
                    required
                    error={errors.confirmPassword?.message}
                  >
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
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
