import { ConflictException, NotFoundException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { UpdateSiteDto } from '@modules/MasterData/Application/DTOs/UpdateSiteDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';

export class UpdateSiteUseCase {
  // Optional audit deps: see CreateSiteUseCase.
  constructor(
    private readonly siteRepository: ISiteRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: UpdateSiteDto, context: AuditContext = SystemAuditContext): Promise<SiteDto> {
    if (this.ownershipPolicy) {
      await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        Action: ActionCode.Update,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
    }

    const site = await this.siteRepository.FindById(request.Id);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    const before = SiteDtoMapper.ToDto(site) as unknown as Record<string, unknown>;

    if (request.SiteCode && request.SiteCode !== site.SiteCode) {
      const duplicate = await this.siteRepository.FindByCode(request.SiteCode);
      if (duplicate && duplicate.Id !== site.Id) {
        throw new ConflictException('Site code already exists');
      }
      site.SiteCode = request.SiteCode;
    }

    site.SiteName = request.SiteName ?? site.SiteName;
    site.Status = request.Status ?? site.Status;
    site.SourceSystem = request.SourceSystem !== undefined ? request.SourceSystem : site.SourceSystem;
    site.ReferenceId = request.ReferenceId !== undefined ? request.ReferenceId : site.ReferenceId;
    site.UpdatedAt = new Date();

    const buildEntry = (updated: SiteEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Update,
        ObjectType: ObjectType.Site,
        ObjectId: updated.Id,
        ObjectCode: updated.SiteCode,
        BeforeJson: before,
        AfterJson: SiteDtoMapper.ToDto(updated) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const updated = await this.siteRepository.Update(site);
      return SiteDtoMapper.ToDto(updated);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const updated = await this.siteRepository.Update(site, manager);
      return { result: SiteDtoMapper.ToDto(updated), entry: buildEntry(updated) };
    });
  }
}
