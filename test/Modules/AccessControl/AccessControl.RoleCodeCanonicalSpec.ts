import { BusinessRuleException, ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { RoleCode } from '@modules/AccessControl/Domain/Enums/RoleCode';
import { CanonicalizeRoleCode } from '@modules/AccessControl/Application/Utils/CanonicalizeRoleCode';
import { CreateRoleUseCase } from '@modules/AccessControl/Application/UseCases/CreateRoleUseCase';
import { GetRoleUseCase } from '@modules/AccessControl/Application/UseCases/GetRoleUseCase';
import { AssignRoleToUserUseCase } from '@modules/AccessControl/Application/UseCases/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@modules/AccessControl/Application/UseCases/RemoveRoleFromUserUseCase';
import { SeedAccessControlRbac } from '@modules/AccessControl/Application/Services/AccessControlRbacSeed';
import {
  InMemoryRoleRepository,
  InMemoryPermissionRepository,
  InMemoryRolePermissionRepository,
  InMemoryUserRoleRepository,
} from '@test/TestDoubles/AccessControl/AccessControlTestDoubles';

// RH-03 (RH-CODE-01): one canonical roleCode policy on every create/get/assign/remove boundary.
describe('CanonicalizeRoleCode', () => {
  it('trims and uppercases valid lower/mixed-case ASCII to canonical', () => {
    expect(CanonicalizeRoleCode('inventory_lead')).toBe('INVENTORY_LEAD');
    expect(CanonicalizeRoleCode('  Inventory_Lead  ')).toBe('INVENTORY_LEAD');
    expect(CanonicalizeRoleCode('qc')).toBe('QC');
    expect(CanonicalizeRoleCode('A'.repeat(50))).toBe('A'.repeat(50)); // 50 chars = max
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['single char', 'A'],
    ['leading digit', '1BAD'],
    ['leading underscore', '_ROLE'],
    ['hyphen', 'BAD-CODE'],
    ['overlength (51)', 'A'.repeat(51)],
  ])('rejects invalid format (%s) with BusinessRuleException (400)', (_label, input) => {
    expect(() => CanonicalizeRoleCode(input)).toThrow(BusinessRuleException);
  });

  it.each([
    ['sharp-s expansion ß->SS', 'AßC'],
    ['dotless i expansion ı->I', 'ADMıN'],
    ['full-width confusable', 'ＡＤＭＩＮ'],
    ['ligature ﬀ->FF expansion', 'ﬀ_ROLE'],
    ['accented latin', 'CAFÉ_ROLE'],
  ])('rejects Unicode expansion/confusable (%s) before uppercasing', (_label, input) => {
    expect(() => CanonicalizeRoleCode(input)).toThrow(BusinessRuleException);
  });
});

describe('roleCode canonical consistency across boundaries', () => {
  const buildWorld = async () => {
    const roles = new InMemoryRoleRepository();
    const perms = new InMemoryPermissionRepository();
    const rolePerms = new InMemoryRolePermissionRepository();
    await SeedAccessControlRbac(roles, perms, rolePerms);
    const userRoles = new InMemoryUserRoleRepository();
    return {
      roles,
      userRoles,
      create: new CreateRoleUseCase(roles),
      get: new GetRoleUseCase(roles, rolePerms, perms),
      assign: new AssignRoleToUserUseCase(roles, userRoles),
      remove: new RemoveRoleFromUserUseCase(roles, userRoles),
    };
  };

  it('get resolves a role created in one case via any valid case variant', async () => {
    const world = await buildWorld();
    await world.create.Execute({ RoleCode: 'inventory_lead', RoleName: 'Inventory Lead' });

    for (const variant of ['INVENTORY_LEAD', 'inventory_lead', 'Inventory_Lead', '  inventory_LEAD  ']) {
      const dto = await world.get.Execute(variant);
      expect(dto.RoleCode).toBe('INVENTORY_LEAD');
    }
  });

  it('assign and remove resolve the same seeded role regardless of case/whitespace', async () => {
    const world = await buildWorld();
    const assigned = await world.assign.Execute({ UserId: 'u1', RoleCode: ' operator ' });
    expect(assigned.RoleCode).toBe(RoleCode.Operator); // OPERATOR

    const removed = await world.remove.Execute({ UserId: 'u1', RoleCode: 'OpErAtOr' });
    expect(removed.Removed).toBe(true);
    expect(await world.userRoles.FindByUserId('u1')).toHaveLength(0);
  });

  it('rejects invalid role codes with 400 at get/assign/remove (before lookup)', async () => {
    const world = await buildWorld();
    await expect(world.get.Execute('1BAD')).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(world.assign.Execute({ UserId: 'u1', RoleCode: 'bad-code' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
    await expect(world.remove.Execute({ UserId: 'u1', RoleCode: 'ＡＤＭＩＮ' })).rejects.toBeInstanceOf(
      BusinessRuleException,
    );
  });

  it('returns 404 for a valid canonical code that does not exist', async () => {
    const world = await buildWorld();
    await expect(world.get.Execute('does_not_exist')).rejects.toBeInstanceOf(NotFoundException);
    await expect(world.assign.Execute({ UserId: 'u1', RoleCode: 'ghost_role' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a case-variant duplicate create with 409 (canonical collision foo vs FOO)', async () => {
    const world = await buildWorld();
    await world.create.Execute({ RoleCode: 'foo_role', RoleName: 'Foo' });
    // A different-case spelling canonicalizes to the same code and must collide via UQ_roles_role_code.
    await expect(world.create.Execute({ RoleCode: 'FOO_ROLE', RoleName: 'Foo again' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(world.create.Execute({ RoleCode: '  Foo_Role  ', RoleName: 'Foo padded' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
