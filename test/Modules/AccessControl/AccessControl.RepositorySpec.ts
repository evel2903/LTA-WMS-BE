import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { UserRoleSource } from '@modules/AccessControl/Domain/Enums/UserRoleSource';
import { RoleEntity } from '@modules/AccessControl/Domain/Entities/RoleEntity';
import { PermissionEntity } from '@modules/AccessControl/Domain/Entities/PermissionEntity';
import { RolePermissionEntity } from '@modules/AccessControl/Domain/Entities/RolePermissionEntity';
import { UserRoleEntity } from '@modules/AccessControl/Domain/Entities/UserRoleEntity';
import { RoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RoleRepository';
import { PermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/PermissionRepository';
import { RolePermissionRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/RolePermissionRepository';
import { UserRoleRepository } from '@modules/AccessControl/Infrastructure/Persistence/Repositories/UserRoleRepository';

const ormRepoThatThrows = (code: string) => ({ save: jest.fn(async () => Promise.reject({ code })) }) as never;

const now = new Date();
const aRole = () =>
  new RoleEntity({ Id: 'r1', RoleCode: RoleCode.WmsAdmin, RoleName: 'A', CreatedAt: now, UpdatedAt: now });
const aPermission = () =>
  new PermissionEntity({
    Id: 'p1',
    Action: ActionCode.Read,
    ObjectType: ObjectType.Role,
    CreatedAt: now,
    UpdatedAt: now,
  });
const aRolePermission = () => new RolePermissionEntity({ Id: 'rp1', RoleId: 'r1', PermissionId: 'p1', CreatedAt: now });
const aUserRole = () =>
  new UserRoleEntity({ Id: 'ur1', UserId: 'u1', RoleId: 'r1', Source: UserRoleSource.Manual, AssignedAt: now });

describe('AccessControl repositories map unique-violation 23505 to ConflictException', () => {
  it('RoleRepository.Create maps 23505 -> ConflictException', async () => {
    await expect(new RoleRepository(ormRepoThatThrows('23505')).Create(aRole())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('PermissionRepository.Create maps 23505 -> ConflictException', async () => {
    await expect(new PermissionRepository(ormRepoThatThrows('23505')).Create(aPermission())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('RolePermissionRepository.Create maps 23505 -> ConflictException', async () => {
    await expect(
      new RolePermissionRepository(ormRepoThatThrows('23505')).Create(aRolePermission()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('UserRoleRepository.Create maps 23505 -> ConflictException', async () => {
    await expect(new UserRoleRepository(ormRepoThatThrows('23505')).Create(aUserRole())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rethrows non-unique errors unchanged (not swallowed as Conflict)', async () => {
    await expect(new RoleRepository(ormRepoThatThrows('23502')).Create(aRole())).rejects.not.toBeInstanceOf(
      ConflictException,
    );
  });

  it('UserRoleRepository.Create maps FK violation 23503 -> NotFoundException', async () => {
    await expect(new UserRoleRepository(ormRepoThatThrows('23503')).Create(aUserRole())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
