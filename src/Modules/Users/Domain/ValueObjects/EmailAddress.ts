export class EmailAddress {
  public readonly Value: string;

  private constructor(value: string) {
    this.Value = value;
  }

  public static Create(raw: string): EmailAddress {
    const normalized = (raw ?? '').trim().toLowerCase();
    if (!EmailAddress.IsValid(normalized)) {
      throw new Error('Invalid email address');
    }
    return new EmailAddress(normalized);
  }

  public static IsValid(value: string): boolean {
    if (!value) return false;
    // Simple + practical; detailed validation is handled at Presentation too.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
