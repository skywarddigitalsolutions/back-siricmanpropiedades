import { ValidationPipe } from '@nestjs/common';
import { CreateLeadDto } from './create-lead.dto';
import { LeadTopic, LeadType } from '../enums/lead.enums';

// Same options as main.ts, so whitelist/forbidNonWhitelisted apply.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const asBody = { type: 'body' as const, metatype: CreateLeadDto };
const PROPERTY_ID = '8f8e2c0e-4a8a-4f43-9a51-2a3c5f9c2b11';

function validInquiry(overrides: Record<string, unknown> = {}) {
  return {
    type: LeadType.PROPERTY_INQUIRY,
    propertyId: PROPERTY_ID,
    name: '  Ana García ',
    phone: '+54 9 11 3896-7363',
    message: 'Hola, me interesa la propiedad.',
    ...overrides,
  };
}

async function errorsFor(body: Record<string, unknown>): Promise<string[]> {
  try {
    await pipe.transform(body, asBody);
    return [];
  } catch (error) {
    const response = (
      error as { getResponse(): { message: string[] } }
    ).getResponse();
    return response.message;
  }
}

describe('CreateLeadDto', () => {
  it('accepts a property inquiry and trims the name', async () => {
    const dto = (await pipe.transform(validInquiry(), asBody)) as CreateLeadDto;

    expect(dto.name).toBe('Ana García');
    expect(dto.type).toBe(LeadType.PROPERTY_INQUIRY);
  });

  it('requires a phone or an email, but not both', async () => {
    expect(
      await errorsFor(
        validInquiry({ phone: undefined, email: 'ana@mail.com' }),
      ),
    ).toEqual([]);
    const errors = await errorsFor(validInquiry({ phone: undefined }));
    expect(errors.some((m) => m.startsWith('phone'))).toBe(true);
    expect(errors.some((m) => m.startsWith('email'))).toBe(true);
  });

  it('rejects malformed phones and emails', async () => {
    expect((await errorsFor(validInquiry({ phone: 'llamame' })))[0]).toMatch(
      /^phone/,
    );
    expect(
      (await errorsFor(validInquiry({ phone: undefined, email: 'ana@' })))[0],
    ).toMatch(/^email/);
  });

  it('requires the property for an inquiry but not for a contact message', async () => {
    expect(
      (await errorsFor(validInquiry({ propertyId: undefined })))[0],
    ).toMatch(/^propertyId/);
    expect(
      await errorsFor(
        validInquiry({
          type: LeadType.CONTACT,
          propertyId: undefined,
          topic: LeadTopic.SELL,
        }),
      ),
    ).toEqual([]);
  });

  it('limits the name and the message', async () => {
    expect((await errorsFor(validInquiry({ name: 'A' })))[0]).toMatch(/^name/);
    expect(
      (await errorsFor(validInquiry({ message: 'x'.repeat(2001) })))[0],
    ).toMatch(/^message/);
  });

  it('accepts appraisal details and rejects unknown detail fields', async () => {
    const details = {
      propertyType: 'apartment',
      address: 'Gorriti 4800, Palermo',
      rooms: 3,
      area: 70,
    };
    const appraisal = validInquiry({
      type: LeadType.APPRAISAL,
      propertyId: undefined,
      details,
    });
    expect(await errorsFor(appraisal)).toEqual([]);
    expect(
      await errorsFor({ ...appraisal, details: { ...details, price: 1 } }),
    ).not.toEqual([]);
  });

  it('keeps the honeypot field so the service can drop bot submissions', async () => {
    const dto = (await pipe.transform(
      validInquiry({ website: 'http://spam.example' }),
      asBody,
    )) as CreateLeadDto;

    expect(dto.website).toBe('http://spam.example');
  });

  it('rejects unknown fields', async () => {
    expect(await errorsFor(validInquiry({ status: 'closed' }))).not.toEqual([]);
  });
});
