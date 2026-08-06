/**
 * Email delivery — provider-agnostic, configurable (Mock locally, Resend in
 * production). Uses global `fetch` (Node 24), so no SDK dependency is required.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<void>;
}

/**
 * Captures emails in memory instead of sending them (local/dev/test). The link
 * is logged so it can be copied during local development.
 */
export class MockEmailProvider implements EmailProvider {
  public readonly name = 'mock';
  public readonly sent: EmailMessage[] = [];

  public async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
    process.stdout.write(`[email:mock] to=${message.to} subject="${message.subject}"\n`);
    return Promise.resolve();
  }

  /** Most recent message sent to `to` (test/dev helper). */
  public lastTo(to: string): EmailMessage | undefined {
    for (let i = this.sent.length - 1; i >= 0; i -= 1) {
      if (this.sent[i]!.to === to) return this.sent[i];
    }
    return undefined;
  }
}

/** Sends through the Resend HTTP API (production). */
export class ResendEmailProvider implements EmailProvider {
  public readonly name = 'resend';

  public constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  public async send(message: EmailMessage): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend API error ${response.status}: ${body}`);
    }
  }
}

function layout(title: string, name: string | null, bodyHtml: string): string {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.6">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    <p style="margin:0 0 12px">${greeting}</p>
    ${bodyHtml}
    <p style="margin:24px 0 0;color:#64748b;font-size:13px">Super Dreams</p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;display:inline-block">${label}</a></p>
  <p style="margin:0 0 12px;color:#64748b;font-size:13px">Or paste this link into your browser:<br><a href="${href}">${href}</a></p>`;
}

/**
 * High-level, template-owning email sender. Builds the member-portal links and
 * delegates delivery to the configured provider.
 */
export class EmailService {
  public constructor(
    private readonly provider: EmailProvider,
    private readonly webAppUrl: string,
  ) {}

  public get providerName(): string {
    return this.provider.name;
  }

  public async sendVerificationEmail(
    to: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const link = `${this.webAppUrl}/activate?token=${encodeURIComponent(token)}`;
    await this.provider.send({
      to,
      subject: 'Activate your Super Dreams account',
      html: layout(
        'Activate your account',
        name,
        `<p style="margin:0 0 12px">Welcome to Super Dreams! Please confirm your email to activate your account.</p>${button(link, 'Activate account')}`,
      ),
      text: `Activate your Super Dreams account: ${link}`,
    });
  }

  public async sendPasswordResetEmail(
    to: string,
    name: string | null,
    token: string,
  ): Promise<void> {
    const link = `${this.webAppUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.provider.send({
      to,
      subject: 'Reset your Super Dreams password',
      html: layout(
        'Reset your password',
        name,
        `<p style="margin:0 0 12px">We received a request to reset your password. This link expires soon.</p>${button(link, 'Reset password')}<p style="margin:0;color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
      ),
      text: `Reset your Super Dreams password: ${link}`,
    });
  }
}
