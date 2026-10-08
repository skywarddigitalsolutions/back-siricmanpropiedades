import { AppraisalDetailsDto } from '../leads/dto/create-lead.dto';
import { LeadStatus, LeadTopic, LeadType } from '../leads/enums/lead.enums';
import { PropertyType } from '../properties/enums/property.enums';

/**
 * `published`: linked to an existing published property; `orphan`: linked to
 * a temporary draft property that the CLI then deletes, so the FK sets it to
 * NULL; `none`: no property.
 */
export type DemoLeadLink = 'none' | 'published' | 'orphan';

export interface DemoLeadSpec {
  type: LeadType;
  topic: LeadTopic | null;
  status: LeadStatus;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  details: AppraisalDetailsDto | null;
  link: DemoLeadLink;
  /** How long before "now" the lead was created. */
  hoursAgo: number;
}

const CLIENT_EMAIL = 'demo.cliente@example.com';

/** All clearly fake: "Demo · " names and example.com emails. */
export const DEMO_LEADS: DemoLeadSpec[] = [
  {
    type: LeadType.APPRAISAL,
    topic: LeadTopic.SELL,
    status: LeadStatus.NEW,
    name: 'Demo · Tasación Palermo',
    email: 'demo.tasacion@example.com',
    phone: null,
    message: 'Quiero saber cuánto vale mi departamento.',
    details: {
      propertyType: PropertyType.APARTMENT,
      address: 'Honduras 4800',
      neighborhood: 'Palermo',
      rooms: 3,
      area: 68,
    },
    link: 'none',
    hoursAgo: 3,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.BUY,
    status: LeadStatus.NEW,
    name: 'Demo · Busca comprar',
    email: 'demo.compra@example.com',
    phone: '+54 9 11 5555-0001',
    message: 'Busco un 3 ambientes en Belgrano hasta USD 150.000.',
    details: null,
    link: 'none',
    hoursAgo: 20,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.RENT,
    status: LeadStatus.CONTACTED,
    name: 'Demo · Busca alquilar',
    email: 'demo.alquiler@example.com',
    phone: null,
    message: 'Necesito alquilar un 2 ambientes que acepte mascotas.',
    details: null,
    link: 'none',
    hoursAgo: 52,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.RENTAL_MANAGEMENT,
    status: LeadStatus.NEW,
    name: 'Demo · Administración de alquiler',
    email: 'demo.administracion@example.com',
    phone: '+54 9 11 5555-0002',
    message: 'Tengo un departamento y quiero que me lo administren.',
    details: null,
    link: 'none',
    hoursAgo: 30,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.CONSORTIUM,
    status: LeadStatus.CLOSED,
    name: 'Demo · Consorcio',
    email: 'demo.consorcio@example.com',
    phone: null,
    message: 'Consulta por administración de un consorcio de 12 unidades.',
    details: null,
    link: 'none',
    hoursAgo: 100,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.OTHER,
    status: LeadStatus.NEW,
    name: 'Demo · Consulta general',
    email: null,
    phone: '+54 9 11 5555-0003',
    message: 'Una consulta que no encaja en ninguna categoría.',
    details: null,
    link: 'none',
    hoursAgo: 8,
  },
  {
    type: LeadType.PROPERTY_INQUIRY,
    topic: null,
    status: LeadStatus.CONTACTED,
    name: 'Demo · Consulta por propiedad',
    email: 'demo.consulta@example.com',
    phone: null,
    message: 'Me interesa la propiedad, ¿se puede visitar este fin de semana?',
    details: null,
    link: 'published',
    hoursAgo: 75,
  },
  {
    type: LeadType.PROPERTY_INQUIRY,
    topic: null,
    status: LeadStatus.NEW,
    name: 'Demo · Propiedad ya borrada',
    email: 'demo.huerfana@example.com',
    phone: null,
    message: 'Consulta sobre una propiedad que después se eliminó.',
    details: null,
    link: 'orphan',
    hoursAgo: 120,
  },
  // One client with two leads and no property inquiry ("Sin propiedad").
  {
    type: LeadType.APPRAISAL,
    topic: LeadTopic.SELL,
    status: LeadStatus.CLOSED,
    name: 'Demo · Cliente sin propiedad',
    email: CLIENT_EMAIL,
    phone: '+54 9 11 5555-0004',
    message: 'Quiero vender mi casa.',
    details: {
      propertyType: PropertyType.HOUSE,
      address: 'Av. Cabildo 2000',
      neighborhood: 'Belgrano',
      rooms: 5,
      area: 140,
    },
    link: 'none',
    hoursAgo: 150,
  },
  {
    type: LeadType.CONTACT,
    topic: LeadTopic.BUY,
    status: LeadStatus.CONTACTED,
    name: 'Demo · Cliente sin propiedad',
    email: CLIENT_EMAIL,
    phone: '+54 9 11 5555-0004',
    message: 'Con lo que venda quiero comprar un departamento más chico.',
    details: null,
    link: 'none',
    hoursAgo: 140,
  },
];

/** Spread over the last week, relative to `now`. */
export function createdAtFor(now: Date, spec: DemoLeadSpec): Date {
  return new Date(now.getTime() - spec.hoursAgo * 3600 * 1000);
}
