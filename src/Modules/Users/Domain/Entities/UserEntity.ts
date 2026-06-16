import { EmailAddress } from '../ValueObjects/EmailAddress';
import { Role } from '../../../../Common/Constants/Role';

export class UserEntity {
  public readonly Id: string;
  public FirstName: string;
  public LastName: string;
  public EmailAddress: EmailAddress;
  public PasswordHash: string | null;
  public Role: Role;
  public readonly CreatedAt: Date;

  constructor(params: {
    Id: string;
    FirstName: string;
    LastName: string;
    EmailAddress: EmailAddress;
    PasswordHash?: string | null;
    Role?: Role;
    CreatedAt: Date;
  }) {
    this.Id = params.Id;
    this.FirstName = params.FirstName;
    this.LastName = params.LastName;
    this.EmailAddress = params.EmailAddress;
    this.PasswordHash = params.PasswordHash ?? null;
    this.Role = params.Role ?? Role.User;
    this.CreatedAt = params.CreatedAt;
  }
}
