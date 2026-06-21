import { ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IPermissionChecker } from '@modules/AccessControl/Application/Interfaces/IPermissionChecker';
import { PermissionDecision } from '@modules/AccessControl/Application/DTOs/PermissionCheckContext';
import { UpdateZoneUseCase } from '@modules/MasterData/Application/UseCases/UpdateZoneUseCase';
import { IZoneRepository } from '@modules/MasterData/Application/Interfaces/IZoneRepository';
import { IWarehouseRepository } from '@modules/MasterData/Application/Interfaces/IWarehouseRepository';
import { ZoneEntity } from '@modules/MasterData/Domain/Entities/ZoneEntity';
import { MasterDataStatus } from '@modules/MasterData/Domain/Enums/MasterDataStatus';

const zone = () =>
  new ZoneEntity({
    Id: 'z1',
    WarehouseId: 'W1',
    ZoneCode: 'PICK',
    ZoneName: 'Pick',
    ZoneType: 'PICKING',
    Status: MasterDataStatus.Active,
    CreatedAt: new Date(),
    UpdatedAt: new Date(),
  });

const zoneRepo = (): IZoneRepository =>
  ({
    FindById: jest.fn(async () => zone()),
    FindByWarehouseAndCode: jest.fn(async () => null),
    Update: jest.fn(async (z: ZoneEntity) => z),
  }) as unknown as IZoneRepository;

const warehouseRepo = (): IWarehouseRepository => ({ FindById: jest.fn() }) as unknown as IWarehouseRepository;

const checker = (decision: PermissionDecision): IPermissionChecker => ({
  Check: jest.fn(async () => decision),
});

describe('UpdateZoneUseCase entity-resident data-scope re-check (C2 F2)', () => {
  it('re-checks the zone warehouse scope against the actor and allows in-scope updates', async () => {
    const c = checker({ Allowed: true });
    const useCase = new UpdateZoneUseCase(zoneRepo(), warehouseRepo(), c);

    const result = await useCase.Execute({ Id: 'z1', ZoneName: 'Renamed', ActorUserId: 'u1' });

    expect(result.ZoneName).toBe('Renamed');
    expect(c.Check).toHaveBeenCalledWith(
      expect.objectContaining({
        UserId: 'u1',
        Action: ActionCode.Update,
        ObjectType: ObjectType.Zone,
        Scope: { WarehouseId: 'W1' },
      }),
    );
  });

  it('throws ForbiddenAppException when the actor is out of the zone warehouse scope', async () => {
    const useCase = new UpdateZoneUseCase(
      zoneRepo(),
      warehouseRepo(),
      checker({ Allowed: false, Reason: 'OUT_OF_SCOPE' }),
    );
    await expect(useCase.Execute({ Id: 'z1', ZoneName: 'X', ActorUserId: 'u1' })).rejects.toBeInstanceOf(
      ForbiddenAppException,
    );
  });

  it('checks the target warehouse scope before moving a zone', async () => {
    const zones = zoneRepo();
    const warehouses = warehouseRepo();
    warehouses.FindById = jest.fn(async () => ({
      Id: 'W2',
      Status: MasterDataStatus.Active,
    })) as unknown as IWarehouseRepository['FindById'];
    const c: IPermissionChecker = {
      Check: jest.fn(async (context) =>
        context.Scope?.WarehouseId === 'W2' ? { Allowed: false, Reason: 'OUT_OF_SCOPE' as const } : { Allowed: true },
      ),
    };
    const useCase = new UpdateZoneUseCase(zones, warehouses, c);

    await expect(useCase.Execute({ Id: 'z1', WarehouseId: 'W2', ActorUserId: 'u1' })).rejects.toBeInstanceOf(
      ForbiddenAppException,
    );
    expect(c.Check).toHaveBeenCalledWith(expect.objectContaining({ Scope: { WarehouseId: 'W1' } }));
    expect(c.Check).toHaveBeenCalledWith(expect.objectContaining({ Scope: { WarehouseId: 'W2' } }));
    expect(zones.Update).not.toHaveBeenCalled();
  });

  it('skips the scope re-check when no actor is supplied (internal callers)', async () => {
    const c = checker({ Allowed: false, Reason: 'OUT_OF_SCOPE' });
    const useCase = new UpdateZoneUseCase(zoneRepo(), warehouseRepo(), c);
    await expect(useCase.Execute({ Id: 'z1', ZoneName: 'X' })).resolves.toBeDefined();
    expect(c.Check).not.toHaveBeenCalled();
  });
});
