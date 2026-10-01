import { Logger } from '@nestjs/common';
import { Lead } from '../entities/lead.entity';
import { LeadNotifier } from './lead-notifier.port';

/** Used while email is not configured. Logs no personal data, only id and type. */
export class LogLeadNotifier implements LeadNotifier {
  private readonly logger = new Logger('Leads');

  notifyNewLead(lead: Lead): Promise<void> {
    this.logger.log(
      `New lead ${lead.id} (${lead.type}); email notifications are not configured`,
    );
    return Promise.resolve();
  }
}
