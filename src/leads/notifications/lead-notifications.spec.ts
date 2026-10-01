import { ConfigService } from '@nestjs/config';
import { buildLeadEmail } from './lead-email';
import { loadLeadNotificationsConfig } from './lead-notifications.config';
import { SmtpLeadNotifier } from './smtp-lead.notifier';
import { LeadStatus, LeadTopic, LeadType } from '../enums/lead.enums';
import { Lead } from '../entities/lead.entity';
import { Property } from '../../properties/entities/property.entity';

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: 'lead-1',
    type: LeadType.PROPERTY_INQUIRY,
    status: LeadStatus.NEW,
    name: 'Ana García',
    phone: '+54 9 11 3896-7363',
    email: 'ana@mail.com',
    message: 'Hola, ¿se puede visitar el sábado?',
    topic: null,
    details: null,
    notes: null,
    property: { code: 'SP-0007', title: 'Casa en Palermo' } as Property,
    createdAt: new Date('2026-09-30T12:00:00Z'),
    updatedAt: new Date('2026-09-30T12:00:00Z'),
    ...overrides,
  };
}

function configWith(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('buildLeadEmail', () => {
  it('summarizes a property inquiry with a link to the inbox', () => {
    const email = buildLeadEmail(lead(), 'https://siricman.com.ar');

    expect(email.subject).toBe('Nueva consulta por SP-0007 · Ana García');
    expect(email.text).toContain('Propiedad: SP-0007 · Casa en Palermo');
    expect(email.text).toContain('Teléfono: +54 9 11 3896-7363');
    expect(email.text).toContain('Email: ana@mail.com');
    expect(email.text).toContain('Hola, ¿se puede visitar el sábado?');
    expect(email.text).toContain(
      'https://siricman.com.ar/admin/consultas/lead-1',
    );
  });

  it('describes contact and appraisal requests', () => {
    expect(
      buildLeadEmail(
        lead({ type: LeadType.CONTACT, property: null, topic: LeadTopic.SELL }),
      ).subject,
    ).toBe('Nuevo mensaje de contacto · Ana García');

    const appraisal = buildLeadEmail(
      lead({
        type: LeadType.APPRAISAL,
        property: null,
        details: { address: 'Gorriti 4800, Palermo', rooms: 3, area: 70 },
      }),
    );
    expect(appraisal.subject).toBe('Nueva solicitud de tasación · Ana García');
    expect(appraisal.text).toContain('Dirección: Gorriti 4800, Palermo');
  });

  it('omits the link when the site URL is unknown', () => {
    expect(buildLeadEmail(lead()).text).not.toContain('/admin/consultas');
  });
});

describe('loadLeadNotificationsConfig', () => {
  const complete = {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_USER: 'avisos@siricman.com.ar',
    SMTP_PASS: 'app-password',
    LEADS_NOTIFY_TO: 'gabriel@siricman.com.ar',
  };

  it('enables SMTP only when host, user, password and recipient are set', () => {
    const config = loadLeadNotificationsConfig(
      configWith({ ...complete, PUBLIC_SITE_URL: 'https://siricman.com.ar/' }),
    );

    expect(config.smtp).toEqual({
      host: 'smtp.gmail.com',
      port: 465,
      user: 'avisos@siricman.com.ar',
      pass: 'app-password',
      from: 'avisos@siricman.com.ar',
      to: 'gabriel@siricman.com.ar',
    });
    expect(config.siteUrl).toBe('https://siricman.com.ar');
    expect(
      loadLeadNotificationsConfig(configWith({ ...complete, SMTP_PASS: '' }))
        .smtp,
    ).toBeNull();
  });

  it('honors a custom port and sender', () => {
    const config = loadLeadNotificationsConfig(
      configWith({
        ...complete,
        SMTP_PORT: '587',
        SMTP_FROM: 'Web <web@siricman.com.ar>',
      }),
    );

    expect(config.smtp).toMatchObject({
      port: 587,
      from: 'Web <web@siricman.com.ar>',
    });
  });
});

describe('SmtpLeadNotifier', () => {
  it('emails the recipient with the lead as reply-to', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const notifier = new SmtpLeadNotifier(
      {
        host: 'smtp.gmail.com',
        port: 465,
        user: 'avisos@siricman.com.ar',
        pass: 'x',
        from: 'avisos@siricman.com.ar',
        to: 'gabriel@siricman.com.ar',
      },
      'https://siricman.com.ar',
      { sendMail },
    );

    await notifier.notifyNewLead(lead());

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'avisos@siricman.com.ar',
        to: 'gabriel@siricman.com.ar',
        replyTo: 'ana@mail.com',
        subject: 'Nueva consulta por SP-0007 · Ana García',
      }),
    );
  });
});
