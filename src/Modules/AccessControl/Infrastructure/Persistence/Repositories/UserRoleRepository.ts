import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { IUserRoleRepository } from '@modules/AccessControl/Application/Interfaces/IUserRoleRepository';
import { UserRoleOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/UserRoleOrmMapper';
import { UserRoleOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/UserRoleOrmEntity';

@Injectable()
export class UserRoleRepository implements IUserRoleRepository {
  constructor(
    @InjectRepository(UserRoleOrmEntity)
    private readonly userRoles: Repository<UserRoleOrmEntity>,
  ) {}

  public async FindByUserId(userId: string): Promise<UserRoleEntity[]> {
    const entities = await this.userRoles.find({ where: { UserId: userId } });
    return entities.map(UserRoleOrmMapper.ToDomain);
  }

  public async FindByUserAndRole(userId: string, roleId: string): Promise<UserRoleEntity | null> {
    const entity = await this.userRoles.findOne({ where: { UserId: userId, RoleId: roleId } });
    return entity ? UserRoleOrmMapper.ToDomain(entity) : null;
  }

  public async Create(userRole: UserRoleEntity): Promise<UserRoleEntity> {
    try {
      const created = await this.userRoles.save(UserRoleOrmMapper.ToOrm(userRole));
      return UserRoleOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleConstraintViolation(error);
      throw error;
    }
  }

  public async Delete(id: string): Promise<void> {
    await this.userRoles.delete({ Id: id });
  }

  private HandleConstraintViolation(error: unknown): void {
    const code = (error as { code?: string }).code;
    if (code === '23505') {
      throw new ConflictException('User already has this role');
    }
    // FK violation: the user (or role) referenced does not exist.
    if (code === '23503') {
      throw new NotFoundException('User or role not found');
    }
  }
}
