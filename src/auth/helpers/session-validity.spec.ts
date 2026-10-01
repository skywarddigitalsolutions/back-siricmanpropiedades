import { isIssuedBeforePasswordChange } from './session-validity';

describe('isIssuedBeforePasswordChange', () => {
  const changedAt = new Date('2026-10-01T12:00:00.900Z');
  const changedSec = Math.floor(changedAt.getTime() / 1000);

  it('is false when the password was never changed', () => {
    expect(isIssuedBeforePasswordChange(changedSec - 1000, null)).toBe(false);
    expect(isIssuedBeforePasswordChange(undefined, null)).toBe(false);
  });

  it('flags tokens issued in an earlier second', () => {
    expect(isIssuedBeforePasswordChange(changedSec - 1, changedAt)).toBe(true);
  });

  it('keeps tokens issued in the same second or later (the fresh session token)', () => {
    expect(isIssuedBeforePasswordChange(changedSec, changedAt)).toBe(false);
    expect(isIssuedBeforePasswordChange(changedSec + 5, changedAt)).toBe(false);
  });

  it('flags a token without iat once the password changed (fail closed)', () => {
    expect(isIssuedBeforePasswordChange(undefined, changedAt)).toBe(true);
  });
});
