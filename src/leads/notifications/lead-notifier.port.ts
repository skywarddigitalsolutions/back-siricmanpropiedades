import { Lead } from '../entities/lead.entity';

export const LEAD_NOTIFIER = Symbol('LEAD_NOTIFIER');

/** Tells the team a new lead arrived (email in production, a log line otherwise). */
export interface LeadNotifier {
  notifyNewLead(lead: Lead): Promise<void>;
}
