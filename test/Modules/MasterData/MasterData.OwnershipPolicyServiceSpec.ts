import { BusinessRuleException, ForbiddenAppException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { IReasonCodeCatalog } from '@modules/AccessControl/Application/Interfaces/IReasonCodeCatalog';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';
import { MasterDataOwnershipPolicyEntity } from '@modules/MasterData/Domain/Entities/MasterDataOwnershipPolicyEntity';
import { IMasterDataOwnershipPolicyRepository } from '@modules/MasterData/Application/Interfaces/IMasterDataOwnershipPolicyRepository';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';

const repoWith = (policy: Partial<MasterDataOwnershipPolicyEntity> | null): IMasterDataOwnershipPolicyRepository => ({
  List: jest.fn(),
  FindByObjectGroup: jest.fn(async () => policy as MasterDataOwnershipPolicyEntity | null),
});

const catalogResolving = (reasonCodeId: string): IReasonCodeCatalog => ({
  ValidateReason: jest.fn(async () => ({
    ReasonCodeId: reasonCodeId,
    EvidenceRequired: false,
    ApprovalRequired: false,
  })),
});

const readOnly: Partial<MasterDataOwnershipPolicyEntity> = {
  DirectEditAllowed: false,
  RequiresAudit: true,
  RequiresReason: false,
  RequiresSourceSystem: false,
  RequiresReferenceId: false,
};

const conditional: Partial<MasterDataOwnershipPolicyEntity> = {
  DirectEditAllowed: true,
  RequiresAudit: true,
  RequiresReason: true,
  RequiresSourceSystem: true,
  RequiresReferenceId: false,
};

describe('MasterDataOwnershipPolicyService.Enforce', () => {
  it('hard-blocks a write to an external read-only group (SOURCE_OF_TRUTH_READONLY)', async () => {
    const service = new MasterDataOwnershipPolicyService(repoWith(readOnly));
    await expect(
      service.Enforce({
        ObjectGroup: MasterDataObjectGroup.Sku,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Create,
      }),
    ).rejects.toBeInstanceOf(ForbiddenAppException);
    await expect(
      service.Enforce({
        ObjectGroup: MasterDataObjectGroup.Sku,
        ObjectType: ObjectType.Sku,
        Action: ActionCode.Update,
      }),
    ).rejects.toMatchObject({ Details: { Reason: 'SOURCE_OF_TRUTH_READONLY' } });
  });

  it('allows a READ on a read-only group (read is not a write action)', async () => {
    const service = new MasterDataOwnershipPolicyService(repoWith(readOnly));
    await expect(
      service.Enforce({ ObjectGroup: MasterDataObjectGroup.Sku, ObjectType: ObjectType.Sku, Action: ActionCode.Read }),
    ).resolves.toEqual({ RequiresAudit: true, ReasonCodeId: null });
  });

  it('requires reason + source-system on a conditional-edit group write', async () => {
    const service = new MasterDataOwnershipPolicyService(repoWith(conditional), catalogResolving('rc1'));
    await expect(
      service.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Update,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleException);
    await expect(
      service.Enforce({
        ObjectGroup: MasterDataObjectGroup.UomPack,
        ObjectType: ObjectType.Uom,
        Action: ActionCode.Update,
        ReasonCode: 'RC-1',
        SourceSystem: 'ERP',
      }),
    ).resolves.toEqual({ RequiresAudit: true, ReasonCodeId: 'rc1' });
  });

  it('validates a supplied reason against the catalog and resolves its id', async () => {
    const catalog = catalogResolving('rc-resolved');
    const service = new MasterDataOwnershipPolicyService(repoWith(conditional), catalog);
    const decision = await service.Enforce({
      ObjectGroup: MasterDataObjectGroup.UomPack,
      ObjectType: ObjectType.Uom,
      Action: ActionCode.Update,
      ReasonCode: 'RC-1',
      SourceSystem: 'ERP',
    });
    expect(decision.ReasonCodeId).toBe('rc-resolved');
    expect(catalog.ValidateReason).toHaveBeenCalledWith({
      ReasonCode: 'RC-1',
      Action: ActionCode.Update,
      ObjectType: ObjectType.Uom,
    });
  });

  it('returns RequiresAudit=true with no block when there is no policy row', async () => {
    const service = new MasterDataOwnershipPolicyService(repoWith(null));
    await expect(
      service.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Warehouse,
        Action: ActionCode.Create,
      }),
    ).resolves.toEqual({ RequiresAudit: true, ReasonCodeId: null });
  });
});
