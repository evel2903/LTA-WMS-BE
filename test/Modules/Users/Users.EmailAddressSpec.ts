import { EmailAddress } from '../../../src/Modules/Users/Domain/ValueObjects/EmailAddress';

describe('EmailAddress', () => {
  it('normalizes email (trim + lowercase)', () => {
    const email = EmailAddress.Create('  TeSt@Example.Com  ');
    expect(email.Value).toBe('test@example.com');
  });

  it('throws on invalid email', () => {
    expect(() => EmailAddress.Create('not-an-email')).toThrow('Invalid email address');
  });
});
