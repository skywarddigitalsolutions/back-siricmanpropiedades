import { LeadCategory, LeadStatus, LeadType } from '../leads/enums/lead.enums';
import { leadCategoryOf } from '../leads/helpers/lead-category';
import { createdAtFor, DEMO_LEADS } from './demo-leads.fixture';

describe('DEMO_LEADS', () => {
  it('is clearly fake data', () => {
    for (const lead of DEMO_LEADS) {
      expect(lead.name.startsWith('Demo · ')).toBe(true);
      if (lead.email) expect(lead.email).toMatch(/@example\.com$/);
      expect(lead.email ?? lead.phone).toBeTruthy();
    }
  });

  it('covers every category and every status', () => {
    const categories = new Set(
      DEMO_LEADS.map((l) => leadCategoryOf(l.type, l.topic)),
    );
    expect(categories).toEqual(new Set(Object.values(LeadCategory)));
    const statuses = new Set(DEMO_LEADS.map((l) => l.status));
    expect(statuses).toEqual(new Set(Object.values(LeadStatus)));
  });

  it('has an appraisal with details and email', () => {
    const appraisal = DEMO_LEADS.find((l) => l.type === LeadType.APPRAISAL);
    expect(appraisal?.email).toBeTruthy();
    expect(Object.keys(appraisal?.details ?? {})).toEqual(
      expect.arrayContaining([
        'propertyType',
        'address',
        'neighborhood',
        'rooms',
        'area',
      ]),
    );
  });

  it('has a published-property inquiry and an orphan inquiry', () => {
    expect(DEMO_LEADS.filter((l) => l.link === 'published')).toHaveLength(1);
    expect(DEMO_LEADS.filter((l) => l.link === 'orphan')).toHaveLength(1);
    for (const l of DEMO_LEADS.filter((l) => l.link !== 'none'))
      expect(l.type).toBe(LeadType.PROPERTY_INQUIRY);
  });

  it('has a client with emails only on appraisal/contact leads', () => {
    const byEmail = new Map<string, typeof DEMO_LEADS>();
    for (const l of DEMO_LEADS) {
      if (!l.email) continue;
      byEmail.set(l.email, [...(byEmail.get(l.email) ?? []), l]);
    }
    const withoutProperty = [...byEmail.values()].filter((leads) =>
      leads.every((l) => l.type !== LeadType.PROPERTY_INQUIRY),
    );
    expect(withoutProperty.length).toBeGreaterThan(0);
    expect(withoutProperty.some((leads) => leads.length > 1)).toBe(true);
  });

  it('spreads creation dates over the last week', () => {
    const now = new Date('2026-10-08T15:00:00Z');
    const times = DEMO_LEADS.map((l) => createdAtFor(now, l).getTime());
    for (const t of times) {
      expect(t).toBeLessThanOrEqual(now.getTime());
      expect(now.getTime() - t).toBeLessThanOrEqual(7 * 24 * 3600 * 1000);
    }
    expect(new Set(times).size).toBeGreaterThan(4);
  });
});
