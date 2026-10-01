import { Lead } from './entities/lead.entity';

/** Admin view of a lead: the property reduced to what the inbox shows and links to. */
export type AdminLeadResponse = Omit<Lead, 'property'> & {
  property: { id: string; code: string; title: string; slug: string } | null;
};

export function toAdminLead(lead: Lead): AdminLeadResponse {
  const { property, ...rest } = lead;
  return {
    ...rest,
    property: property
      ? {
          id: property.id,
          code: property.code,
          title: property.title,
          slug: property.slug,
        }
      : null,
  };
}
