import { randomUUID } from 'crypto';
import { ConflictException } from '@common/Exceptions/AppException';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import {
  AuditContext,
  MergeAuditContext,
  SystemAuditContext,
} from '@modules/AccessControl/Application/DTOs/AuditContext';
import { AuditedTransaction } from '@modules/AccessControl/Application/Services/AuditedTransaction';
import { CreateSiteDto } from '@modules/MasterData/Application/DTOs/CreateSiteDto';
import { SiteDto } from '@modules/MasterData/Application/DTOs/SiteDto';
import { ISiteRepository } from '@modules/MasterData/Application/Interfaces/ISiteRepository';
import { SiteDtoMapper } from '@modules/MasterData/Application/Mappers/SiteDtoMapper';
import { MasterDataOwnershipPolicyService } from '@modules/MasterData/Application/Services/MasterDataOwnershipPolicyService';
import { SiteEntity } from '@modules/MasterData/Domain/Entities/SiteEntity';
import { MasterDataObjectGroup } from '@modules/MasterData/Domain/Enums/MasterDataObjectGroup';

export class CreateSiteUseCase {
  // Optional audit deps: bare for fixture tests; the module always wires them (production audits).
  constructor(
    private readonly siteRepository: ISiteRepository,
    private readonly ownershipPolicy?: MasterDataOwnershipPolicyService,
    private readonly auditedTransaction?: AuditedTransaction,
  ) {}

  public async Execute(request: CreateSiteDto, context: AuditContext = SystemAuditContext): Promise<SiteDto> {
    let reasonCodeId: string | null = null;
    if (this.ownershipPolicy) {
      const decision = await this.ownershipPolicy.Enforce({
        ObjectGroup: MasterDataObjectGroup.WarehouseLocation,
        ObjectType: ObjectType.Site,
        Action: ActionCode.Create,
        ReasonCode: request.ReasonCode ?? null,
        SourceSystem: request.SourceSystem ?? null,
        ReferenceId: request.ReferenceId ?? null,
      });
      reasonCodeId = decision.ReasonCodeId ?? null;
    }

    const existing = await this.siteRepository.FindByCode(request.SiteCode);
    if (existing) {
      throw new ConflictException('Site code already exists');
    }

    const now = new Date();
    const site = new SiteEntity({
      Id: randomUUID(),
      SiteCode: request.SiteCode,
      SiteName: request.SiteName,
      Status: request.Status,
      SourceSystem: request.SourceSystem ?? null,
      ReferenceId: request.ReferenceId ?? null,
      CreatedAt: now,
      UpdatedAt: now,
    });

    const buildEntry = (created: SiteEntity) =>
      MergeAuditContext(context, {
        Action: ActionCode.Create,
        ObjectType: ObjectType.Site,
        ObjectId: created.Id,
        ObjectCode: created.SiteCode,
        ReasonCodeId: reasonCodeId,
        AfterJson: SiteDtoMapper.ToDto(created) as unknown as Record<string, unknown>,
      });

    if (!this.auditedTransaction) {
      const created = await this.siteRepository.Create(site);
      return SiteDtoMapper.ToDto(created);
    }
    return this.auditedTransaction.Run(async (manager) => {
      const created = await this.siteRepository.Create(site, manager);
      return { result: SiteDtoMapper.ToDto(created), entry: buildEntry(created) };
    });
  }
}
