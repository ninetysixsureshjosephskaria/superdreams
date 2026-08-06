import { config } from '@/config';

import {
  EmailService,
  MockEmailProvider,
  ResendEmailProvider,
  type EmailProvider,
} from './email.service';

/**
 * Builds the {@link EmailService} for the current configuration: Resend when
 * `EMAIL_PROVIDER=resend` and an API key is present, otherwise the in-memory
 * Mock provider (local/dev/test). Delivery never blocks or crashes callers by
 * itself — callers decide how to treat a send failure.
 */
export function createEmailService(): EmailService {
  const { provider, resendApiKey, from, webAppUrl } = config.email;
  let impl: EmailProvider;
  if (provider === 'resend' && resendApiKey) {
    impl = new ResendEmailProvider(resendApiKey, from);
  } else {
    impl = new MockEmailProvider();
  }
  return new EmailService(impl, webAppUrl);
}

export {
  EmailService,
  MockEmailProvider,
  ResendEmailProvider,
  type EmailProvider,
  type EmailMessage,
} from './email.service';
