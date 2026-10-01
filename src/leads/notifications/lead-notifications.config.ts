import { ConfigService } from '@nestjs/config';

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
};

export type LeadNotificationsConfig = {
  /** `null` when email is not configured: new leads are only logged. */
  smtp: SmtpSettings | null;
  /** Public site origin for the panel link in the email, if known. */
  siteUrl?: string;
};

/**
 * Email notifications turn on only when SMTP_HOST, SMTP_USER, SMTP_PASS and
 * LEADS_NOTIFY_TO are all set (Google Workspace: smtp.gmail.com, port 465,
 * an app password). SMTP_PORT and SMTP_FROM are optional.
 */
export function loadLeadNotificationsConfig(
  config: ConfigService,
): LeadNotificationsConfig {
  const read = (key: string) => config.get<string>(key)?.trim() || undefined;
  const host = read('SMTP_HOST');
  const user = read('SMTP_USER');
  const pass = read('SMTP_PASS');
  const to = read('LEADS_NOTIFY_TO');
  const siteUrl = read('PUBLIC_SITE_URL')?.replace(/\/+$/, '');

  const smtp =
    host && user && pass && to
      ? {
          host,
          port: Number(read('SMTP_PORT') ?? 465),
          user,
          pass,
          from: read('SMTP_FROM') ?? user,
          to,
        }
      : null;

  return { smtp, ...(siteUrl ? { siteUrl } : {}) };
}
