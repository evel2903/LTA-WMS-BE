import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { ConflictException } from '@common/Exceptions/AppException';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { IRolePermissionRepository } from '@modules/AccessControl/Application/Interfaces/IRolePermissionRepository';
import { RolePermissionOrmMapper } from '@modules/AccessControl/Infrastructure/Mappers/RolePermissionOrmMapper';
import { RolePermissionOrmEntity } from '@modules/AccessControl/Infrastructure/Persistence/Entities/RolePermissionOrmEntity';

@Injectable()
export class RolePermissionRepository implements IRolePermissionRepository {
  constructor(
    @InjectRepository(RolePermissionOrmEntity)
    private readonly rolePermissions: Repository<RolePermissionOrmEntity>,
  ) {}

  public async FindByRoleAndPermission(roleId: string, permissionId: string): Promise<RolePermissionEntity | null> {
    const entity = await this.rolePermissions.findOne({ where: { RoleId: roleId, PermissionId: permissionId } });
    return entity ? RolePermissionOrmMapper.ToDomain(entity) : null;
  }

  public async FindByRoleId(roleId: string, manager?: EntityManager): Promise<RolePermissionEntity[]> {
    const repo = manager ? manager.getRepository(RolePermissionOrmEntity) : this.rolePermissions;
    const entities = await repo.find({ where: { RoleId: roleId } });
    return entities.map(RolePermissionOrmMapper.ToDomain);
  }

  public async FindByRoleIds(roleIds: string[]): Promise<RolePermissionEntity[]> {
    if (roleIds.length === 0) return [];
    const entities = await this.rolePermissions.find({ where: { RoleId: In(roleIds) } });
    return entities.map(RolePermissionOrmMapper.ToDomain);
  }

  public async FindByPermissionId(permissionId: string): Promise<RolePermissionEntity[]> {
    const entities = await this.rolePermissions.find({ where: { PermissionId: permissionId } });
    return entities.map(RolePermissionOrmMapper.ToDomain);
  }

  public async Create(rolePermission: RolePermissionEntity, manager?: EntityManager): Promise<RolePermissionEntity> {
    const repo = manager ? manager.getRepository(RolePermissionOrmEntity) : this.rolePermissions;
    try {
      const created = await repo.save(RolePermissionOrmMapper.ToOrm(rolePermission));
      return RolePermissionOrmMapper.ToDomain(created);
    } catch (error) {
      this.HandleUniqueViolation(error);
      throw error;
    }
  }

  public async Delete(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(RolePermissionOrmEntity) : this.rolePermissions;
    await repo.delete({ Id: id });
  }

  private HandleUniqueViolation(error: unknown): void {
    if ((error as { code?: string }).code === '23505') {
      throw new ConflictException('Permission is already granted to this role');
    }
  }
}
