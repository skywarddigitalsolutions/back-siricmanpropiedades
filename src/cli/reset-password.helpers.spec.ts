import * as bcrypt from 'bcrypt';
import {
  hashNewPassword,
  parseUserName,
  validateNewPassword,
} from './reset-password.helpers';

describe('parseUserName', () => {
  it('takes the first argument, trimmed and lowercased', () => {
    expect(parseUserName([' Admin '])).toBe('admin');
  });

  it('throws a usage error without a user name', () => {
    expect(() => parseUserName([])).toThrow(/Uso/);
    expect(() => parseUserName(['  '])).toThrow(/Uso/);
  });
});

describe('validateNewPassword', () => {
  it('accepts a policy-compliant password', () => {
    expect(validateNewPassword('NuevaClave1')).toBeNull();
  });

  it.each([
    ['Ab1', /al menos 6/],
    ['a'.repeat(51) + 'A1', /como máximo 50/],
    ['sinmayuscula1', /mayúscula/],
    ['SINMINUSCULA1', /minúscula/],
    ['SinNumeroAlguno', /número/],
  ])('rejects %s', (password, message) => {
    expect(validateNewPassword(password)).toMatch(message);
  });
});

describe('hashNewPassword', () => {
  it('returns a bcrypt hash that verifies against the password', async () => {
    const hash = await hashNewPassword('NuevaClave1');

    expect(hash).not.toContain('NuevaClave1');
    expect(await bcrypt.compare('NuevaClave1', hash)).toBe(true);
  });
});
