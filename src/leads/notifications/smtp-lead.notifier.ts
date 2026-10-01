import { createTransport } from 'nodemailer';
import { Lead } from '../entities/lead.entity';
import { buildLeadEmail } from './lead-email';
import { SmtpSettings } from './lead-notifications.config';
import { LeadNotifier } from './lead-notifier.port';

/** The part of a nodemailer transport this adapter uses (replaceable in tests). */
export type MailTransport = {
  sendMail(message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
  }): Promise<unknown>;
};

/** Emails each new lead to the team; replying goes straight to the visitor. */
export class SmtpLeadNotifier implements LeadNotifier {
  private readonly transport: MailTransport;

  constructor(
    private readonly settings: SmtpSettings,
    private readonly siteUrl?: string,
    transport?: MailTransport,
  ) {
    this.transport =
      transport ??
      createTransport({
        host: settings.host,
        port: settings.port,
        // Port 465 is implicit TLS; other ports upgrade with STARTTLS.
        secure: settings.port === 465,
        auth: { user: settings.user, pass: settings.pass },
      });
  }

  async notifyNewLead(lead: Lead): Promise<void> {
    const { subject, text } = buildLeadEmail(lead, this.siteUrl);
    await this.transport.sendMail({
      from: this.settings.from,
      to: this.settings.to,
      ...(lead.email ? { replyTo: lead.email } : {}),
      subject,
      text,
    });
  }
}
