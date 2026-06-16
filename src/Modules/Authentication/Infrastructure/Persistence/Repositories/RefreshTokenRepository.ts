import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  CreateRefreshTokenInput,
  IRefreshTokenRepository,
  RefreshTokenRecord,
} from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { RefreshTokenOrmEntity } from '@modules/Authentication/Infrastructure/Persistence/Entities/RefreshTokenOrmEntity';

@Injectable()
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly tokens: Repository<RefreshTokenOrmEntity>,
  ) {}

  public async Save(input: CreateRefreshTokenInput): Promise<void> {
    const entity = new RefreshTokenOrmEntity();
    entity.Id = randomUUID();
    entity.UserId = input.UserId;
    entity.TokenHash = input.TokenHash;
    entity.ExpiresAt = input.ExpiresAt;
    entity.RevokedAt = null;
    await this.tokens.save(entity);
  }

  public async FindByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const entity = await this.tokens.findOne({ where: { TokenHash: tokenHash } });
    return entity ? this.ToRecord(entity) : null;
  }

  public async RevokeByHash(tokenHash: string): Promise<void> {
    await this.tokens.update({ TokenHash: tokenHash, RevokedAt: IsNull() }, { RevokedAt: new Date() });
  }

  public async RevokeAllForUser(userId: string): Promise<void> {
    await this.tokens.update({ UserId: userId, RevokedAt: IsNull() }, { RevokedAt: new Date() });
  }

  private ToRecord(entity: RefreshTokenOrmEntity): RefreshTokenRecord {
    return {
      Id: entity.Id,
      UserId: entity.UserId,
      TokenHash: entity.TokenHash,
      ExpiresAt: entity.ExpiresAt,
      RevokedAt: entity.RevokedAt,
      CreatedAt: entity.CreatedAt,
    };
  }
}
