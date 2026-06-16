export const PASSWORD_HASHER = Symbol('IPasswordHasher');

export interface IPasswordHasher {
  Hash(plainPassword: string): Promise<string>;
  Verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}
