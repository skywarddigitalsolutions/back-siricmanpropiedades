import { LeadCategory, LeadTopic, LeadType } from '../enums/lead.enums';
import { categoryWhere, leadCategoryOf } from './lead-category';

describe('leadCategoryOf', () => {
  it.each([
    [LeadType.APPRAISAL, null, LeadCategory.APPRAISAL],
    [LeadType.APPRAISAL, LeadTopic.SELL, LeadCategory.APPRAISAL],
    [LeadType.PROPERTY_INQUIRY, null, LeadCategory.SEARCH],
    [LeadType.PROPERTY_INQUIRY, LeadTopic.OTHER, LeadCategory.SEARCH],
    [LeadType.CONTACT, LeadTopic.BUY, LeadCategory.SEARCH],
    [LeadType.CONTACT, LeadTopic.RENT, LeadCategory.SEARCH],
    [LeadType.CONTACT, LeadTopic.RENTAL_MANAGEMENT, LeadCategory.MANAGEMENT],
    [LeadType.CONTACT, LeadTopic.CONSORTIUM, LeadCategory.MANAGEMENT],
    [LeadType.CONTACT, LeadTopic.SELL, LeadCategory.OTHER],
    [LeadType.CONTACT, LeadTopic.OTHER, LeadCategory.OTHER],
    [LeadType.CONTACT, null, LeadCategory.OTHER],
  ])('%s + %s -> %s', (type, topic, expected) => {
    expect(leadCategoryOf(type, topic)).toBe(expected);
  });
});

describe('categoryWhere', () => {
  it('appraisal matches the appraisal type only', () => {
    const clause = categoryWhere(LeadCategory.APPRAISAL);
    expect(clause.sql).toBe('lead.type = :catAppraisal');
    expect(clause.params).toEqual({ catAppraisal: LeadType.APPRAISAL });
  });

  it('search matches inquiries and contacts about buying or renting', () => {
    const clause = categoryWhere(LeadCategory.SEARCH);
    expect(clause.sql).toBe(
      '(lead.type = :catInquiry OR (lead.type = :catContact AND lead.topic IN (:...catTopics)))',
    );
    expect(clause.params).toEqual({
      catInquiry: LeadType.PROPERTY_INQUIRY,
      catContact: LeadType.CONTACT,
      catTopics: [LeadTopic.BUY, LeadTopic.RENT],
    });
  });

  it('management matches contacts about rental management or consortium', () => {
    const clause = categoryWhere(LeadCategory.MANAGEMENT);
    expect(clause.sql).toBe(
      '(lead.type = :catContact AND lead.topic IN (:...catTopics))',
    );
    expect(clause.params).toEqual({
      catContact: LeadType.CONTACT,
      catTopics: [LeadTopic.RENTAL_MANAGEMENT, LeadTopic.CONSORTIUM],
    });
  });

  it('other matches the remaining contacts, including a NULL topic', () => {
    const clause = categoryWhere(LeadCategory.OTHER);
    expect(clause.sql).toBe(
      '(lead.type = :catContact AND (lead.topic IS NULL OR lead.topic NOT IN (:...catTopics)))',
    );
    expect(clause.params).toEqual({
      catContact: LeadType.CONTACT,
      catTopics: [
        LeadTopic.BUY,
        LeadTopic.RENT,
        LeadTopic.RENTAL_MANAGEMENT,
        LeadTopic.CONSORTIUM,
      ],
    });
  });
});
