import { buildLeadWhere } from './lead-query.builder';
import { LeadStatus, LeadType } from '../enums/lead.enums';

describe('buildLeadWhere', () => {
  it('returns no clauses without filters', () => {
    expect(buildLeadWhere({})).toEqual([]);
  });

  it('builds parameterised clauses for status, type and propertyId', () => {
    const where = buildLeadWhere({
      status: LeadStatus.NEW,
      type: LeadType.CONTACT,
      propertyId: 'p-1',
    });

    expect(where).toEqual([
      { sql: 'lead.status = :status', params: { status: LeadStatus.NEW } },
      { sql: 'lead.type = :type', params: { type: LeadType.CONTACT } },
      { sql: 'lead.property = :propertyId', params: { propertyId: 'p-1' } },
    ]);
  });

  it('can leave the status out (used for the per-status counts)', () => {
    const where = buildLeadWhere(
      { status: LeadStatus.NEW, type: LeadType.CONTACT },
      { includeStatus: false },
    );

    expect(where.map((c) => c.sql)).toEqual(['lead.type = :type']);
  });

  it('matches q against name, email, phone and message with escaped wildcards', () => {
    const [clause] = buildLeadWhere({ q: '100%_x' });

    expect(clause.sql).toBe(
      '(lead.name ILIKE :q OR lead.email ILIKE :q OR lead.phone ILIKE :q OR lead.message ILIKE :q)',
    );
    expect(clause.params).toEqual({ q: String.raw`%100\%\_x%` });
  });
});
