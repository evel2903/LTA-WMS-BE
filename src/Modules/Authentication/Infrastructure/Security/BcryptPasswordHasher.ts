import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../Domain/Interfaces/IPasswordHasher';

@Injectable()
export class BcryptPasswordHasher implements IPasswordHasher {
  public async Hash(plainPassword: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
  }

  public async Verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, passwordHash);
  }
}
