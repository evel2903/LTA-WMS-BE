import { Role } from '../../../../Common/Constants/Role';

export type AuthResultDto = {
  AccessToken: string;
  ExpiresIn: string;
  User: { Id: string; EmailAddress: string; Role: Role };
};
