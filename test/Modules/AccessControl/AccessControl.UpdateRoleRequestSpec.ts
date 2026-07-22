import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RoleStatus } from '@modules/AccessControl/Domain/Enums/RoleStatus';
import { UpdateRoleRequest } from '@modules/AccessControl/Presentation/Requests/UpdateRoleRequest';

const validateRequest = (input: Record<string, unknown>) =>
  validate(plainToInstance(UpdateRoleRequest, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

describe('UpdateRoleRequest', () => {
  const token = '2026-07-22T06:00:00.123Z';

  it.each([
    ['literal empty body', {}],
    ['missing token', { RoleName: 'Name' }],
    ['malformed token', { ExpectedUpdatedAt: 'yesterday', RoleName: 'Name' }],
    ['date-only token', { ExpectedUpdatedAt: '2026-07-22', RoleName: 'Name' }],
    ['timezone-less token', { ExpectedUpdatedAt: '2026-07-22T06:00:00.123', RoleName: 'Name' }],
    ['offset token', { ExpectedUpdatedAt: '2026-07-22T13:00:00.123+07:00', RoleName: 'Name' }],
    ['non-millisecond token', { ExpectedUpdatedAt: '2026-07-22T06:00:00.123456Z', RoleName: 'Name' }],
    ['unknown field', { ExpectedUpdatedAt: token, Nope: true }],
    ['invalid enum', { ExpectedUpdatedAt: token, Status: 'BROKEN' }],
    ['whitespace-only name after trim', { ExpectedUpdatedAt: token, RoleName: '   ' }],
  ])('rejects %s at the DTO boundary', async (_label, input) => {
    expect(await validateRequest(input)).not.toHaveLength(0);
  });

  it('accepts token-only and trims RoleName before the use case', async () => {
    const tokenOnly = plainToInstance(UpdateRoleRequest, { ExpectedUpdatedAt: token });
    expect(await validate(tokenOnly)).toHaveLength(0);

    const withName = plainToInstance(UpdateRoleRequest, {
      ExpectedUpdatedAt: token,
      RoleName: '  Warehouse Admin  ',
      Status: RoleStatus.Active,
    });
    expect(await validate(withName)).toHaveLength(0);
    expect(withName.RoleName).toBe('Warehouse Admin');
  });
});
