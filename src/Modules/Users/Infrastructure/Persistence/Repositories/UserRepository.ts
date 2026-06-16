import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../Domain/Entities/UserEntity';
import { IUserRepository } from '../../../Domain/Interfaces/IUserRepository';
import { UserOrmMapper } from '../../Mappers/UserOrmMapper';
import { UserOrmEntity } from '../Entities/UserOrmEntity';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly users: Repository<UserOrmEntity>,
  ) {}

  public async FindById(id: string): Promise<UserEntity | null> {
    const entity = await this.users.findOne({ where: { Id: id } });
    return entity ? UserOrmMapper.ToDomain(entity) : null;
  }

  public async FindByEmail(emailAddress: string): Promise<UserEntity | null> {
    const entity = await this.users.findOne({ where: { EmailAddress: emailAddress.toLowerCase() } });
    return entity ? UserOrmMapper.ToDomain(entity) : null;
  }

  public async Create(user: UserEntity): Promise<UserEntity> {
    const created = await this.users.save(UserOrmMapper.ToOrm(user));
    return UserOrmMapper.ToDomain(created);
  }

  public async Update(user: UserEntity): Promise<void> {
    await this.users.save(UserOrmMapper.ToOrm(user));
  }

  public async Delete(id: string): Promise<void> {
    await this.users.delete({ Id: id });
  }

  public async List(skip: number, take: number): Promise<{ Items: UserEntity[]; TotalItems: number }> {
    const [items, total] = await this.users.findAndCount({
      order: { CreatedAt: 'DESC' },
      skip,
      take,
    });

    return {
      Items: items.map(UserOrmMapper.ToDomain),
      TotalItems: total,
    };
  }
}
