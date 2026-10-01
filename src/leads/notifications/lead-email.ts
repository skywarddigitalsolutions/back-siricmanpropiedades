import { Lead } from '../entities/lead.entity';
import { LeadTopic, LeadType } from '../enums/lead.enums';

const TOPIC_LABELS: Record<LeadTopic, string> = {
  [LeadTopic.BUY]: 'Quiere comprar',
  [LeadTopic.RENT]: 'Quiere alquilar',
  [LeadTopic.SELL]: 'Quiere vender o tasar',
  [LeadTopic.CONSORTIUM]: 'Administración de consorcios',
  [LeadTopic.OTHER]: 'Otro',
};

function subjectFor(lead: Lead): string {
  if (lead.type === LeadType.PROPERTY_INQUIRY && lead.property) {
    return `Nueva consulta por ${lead.property.code} · ${lead.name}`;
  }
  if (lead.type === LeadType.APPRAISAL)
    return `Nueva solicitud de tasación · ${lead.name}`;
  return `Nuevo mensaje de contacto · ${lead.name}`;
}

/**
 * Plain-text email for a new lead (Spanish, it goes to the team). Includes a
 * link to the panel when the public site URL is known.
 */
export function buildLeadEmail(
  lead: Lead,
  siteUrl?: string,
): { subject: string; text: string } {
  const lines: string[] = [`Nombre: ${lead.name}`];
  if (lead.phone) lines.push(`Teléfono: ${lead.phone}`);
  if (lead.email) lines.push(`Email: ${lead.email}`);
  if (lead.property)
    lines.push(`Propiedad: ${lead.property.code} · ${lead.property.title}`);
  if (lead.topic) lines.push(`Motivo: ${TOPIC_LABELS[lead.topic]}`);
  if (lead.details) {
    const { address, rooms, area, propertyType } = lead.details;
    if (propertyType) lines.push(`Tipo: ${propertyType}`);
    if (address) lines.push(`Dirección: ${address}`);
    if (rooms !== undefined) lines.push(`Ambientes: ${rooms}`);
    if (area !== undefined) lines.push(`Superficie aprox.: ${area} m²`);
  }
  if (lead.message) lines.push('', 'Mensaje:', lead.message);
  if (siteUrl)
    lines.push('', `Ver en el panel: ${siteUrl}/admin/consultas/${lead.id}`);

  return { subject: subjectFor(lead), text: lines.join('\n') };
}
