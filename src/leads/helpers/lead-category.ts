import { LeadCategory, LeadTopic, LeadType } from '../enums/lead.enums';
import type { WhereClause } from '../../properties/helpers/property-query.builder';

/** Query-builder alias of the leads table (shared with the query builder). */
export const LEAD_ALIAS = 'lead';

const SEARCH_TOPICS = [LeadTopic.BUY, LeadTopic.RENT];
const MANAGEMENT_TOPICS = [LeadTopic.RENTAL_MANAGEMENT, LeadTopic.CONSORTIUM];

/**
 * The one category rule:
 * - appraisal: type appraisal
 * - search: property inquiries, and contacts about buying or renting
 * - management: contacts about rental management or consortium
 * - other: any other contact (sell, other, no topic)
 * `categoryWhere` is its SQL twin; keep both in sync.
 */
export function leadCategoryOf(
  type: LeadType,
  topic: LeadTopic | null | undefined,
): LeadCategory {
  if (type === LeadType.APPRAISAL) return LeadCategory.APPRAISAL;
  if (type === LeadType.PROPERTY_INQUIRY) return LeadCategory.SEARCH;
  if (topic && SEARCH_TOPICS.includes(topic)) return LeadCategory.SEARCH;
  if (topic && MANAGEMENT_TOPICS.includes(topic))
    return LeadCategory.MANAGEMENT;
  return LeadCategory.OTHER;
}

/** SQL equivalent of `leadCategoryOf`, as a bound-parameter clause. */
export function categoryWhere(category: LeadCategory): WhereClause {
  const type = `${LEAD_ALIAS}.type`;
  const topic = `${LEAD_ALIAS}.topic`;
  switch (category) {
    case LeadCategory.APPRAISAL:
      return {
        sql: `${type} = :catAppraisal`,
        params: { catAppraisal: LeadType.APPRAISAL },
      };
    case LeadCategory.SEARCH:
      return {
        sql: `(${type} = :catInquiry OR (${type} = :catContact AND ${topic} IN (:...catTopics)))`,
        params: {
          catInquiry: LeadType.PROPERTY_INQUIRY,
          catContact: LeadType.CONTACT,
          catTopics: SEARCH_TOPICS,
        },
      };
    case LeadCategory.MANAGEMENT:
      return {
        sql: `(${type} = :catContact AND ${topic} IN (:...catTopics))`,
        params: { catContact: LeadType.CONTACT, catTopics: MANAGEMENT_TOPICS },
      };
    case LeadCategory.OTHER:
      return {
        sql: `(${type} = :catContact AND (${topic} IS NULL OR ${topic} NOT IN (:...catTopics)))`,
        params: {
          catContact: LeadType.CONTACT,
          catTopics: [...SEARCH_TOPICS, ...MANAGEMENT_TOPICS],
        },
      };
  }
}
