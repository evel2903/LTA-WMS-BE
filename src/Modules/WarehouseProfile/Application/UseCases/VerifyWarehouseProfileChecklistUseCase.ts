import { BusinessRuleException, NotFoundException } from '@common/Exceptions/AppException';
import { WarehouseProfileChecklistDto } from '@modules/WarehouseProfile/Application/DTOs/WarehouseProfileChecklistDto';
import { IRuleResolver } from '@modules/WarehouseProfile/Application/Interfaces/IRuleResolver';
import { IWarehouseProfileRepository } from '@modules/WarehouseProfile/Application/Interfaces/IWarehouseProfileRepository';
import { WarehouseProfileChecklistService } from '@modules/WarehouseProfile/Application/Services/WarehouseProfileChecklistService';
import { WarehouseProfileEntity } from '@modules/WarehouseProfile/Domain/Entities/WarehouseProfileEntity';
import { WarehouseProfileStatus } from '@modules/WarehouseProfile/Domain/Enums/WarehouseProfileStatus';

/**
 * Input identifies the target profile either directly (ProfileId, evaluated regardless of status so
 * a pre-activation review of a DRAFT candidate is possible) or by scope/type (the most-specific
 * ACTIVE profile for the type is selected). The six axes mirror the resolver context.
 */
export interface VerifyWarehouseProfileChecklistInput {
  ProfileId?: string | null;
  WarehouseTypeCode?: string | null;
  WarehouseId?: string | null;
  EvaluatedAt?: Date;
}

/**
 * Stable B7 entry point reused by C10/C12 (AC5). Pure class (no @Injectable); wired via useFactory.
 * It resolves the target profile, then delegates scoring to WarehouseProfileChecklistService. The
 * only thrown error is NotFoundException (an explicit ProfileId is absent, or no profile of the
 * requested type exists at all); Fail/Warning are data on the returned DTO.
 *
 * The resolver port is retained so a future type-scoped run can be threaded through the single B3
 * selection path; today the type path selects the active fallback profile for the type directly,
 * using the same documented tie-break (newest version, then newest effective_from).
 */
export class VerifyWarehouseProfileChecklistUseCase {
  constructor(
    private readonly profiles: IWarehouseProfileRepository,
    private readonly resolver: IRuleResolver,
    private readonly checklistService: WarehouseProfileChecklistService,
  ) {
    // resolver is part of the stable signature for C10/C12 and future scope-threaded selection.
    void this.resolver;
  }

  public async Execute(input: VerifyWarehouseProfileChecklistInput): Promise<WarehouseProfileChecklistDto> {
    const evaluatedAt = input.EvaluatedAt ?? new Date();
    const profile = await this.ResolveTarget(input, evaluatedAt);
    return this.checklistService.Verify(profile, evaluatedAt);
  }

  private async ResolveTarget(
    input: VerifyWarehouseProfileChecklistInput,
    evaluatedAt: Date,
  ): Promise<WarehouseProfileEntity> {
    if (input.ProfileId != null && input.ProfileId.trim().length > 0) {
      const profile = await this.profiles.FindById(input.ProfileId);
      if (!profile) {
        throw new NotFoundException(`Warehouse profile ${input.ProfileId} was not found`);
      }
      return profile;
    }

    if (input.WarehouseTypeCode == null || input.WarehouseTypeCode.trim().length === 0) {
      throw new BusinessRuleException('Either a ProfileId or a WarehouseTypeCode is required to run the checklist');
    }

    const warehouseTypeCode = input.WarehouseTypeCode;
    const activeForType = (await this.profiles.ListActiveByScope(evaluatedAt)).filter(
      (profile) => profile.WarehouseTypeCode === warehouseTypeCode,
    );
    const selectedActive = this.MostSpecificActive(activeForType);
    if (selectedActive) {
      return selectedActive;
    }

    // No ACTIVE profile resolves for the type. Surface any profile of that type so the checklist can
    // report the failing WP-ACTIVE / WP-DEFAULT items rather than throwing.
    const anyOfType = await this.FirstProfileOfType(warehouseTypeCode);
    if (!anyOfType) {
      throw new NotFoundException(`No warehouse profile found for warehouse type ${warehouseTypeCode}`);
    }
    return anyOfType;
  }

  /** Tie-break matches the B3 resolver: newest Version, then newest EffectiveFrom. */
  private MostSpecificActive(candidates: WarehouseProfileEntity[]): WarehouseProfileEntity | null {
    if (candidates.length === 0) {
      return null;
    }
    return candidates.reduce((best, candidate) => {
      if (candidate.Version !== best.Version) {
        return candidate.Version > best.Version ? candidate : best;
      }
      return candidate.EffectiveFrom.getTime() > best.EffectiveFrom.getTime() ? candidate : best;
    });
  }

  private async FirstProfileOfType(warehouseTypeCode: string): Promise<WarehouseProfileEntity | null> {
    const pageSize = 100;
    let skip = 0;
    let firstOfType: WarehouseProfileEntity | null = null;
    for (;;) {
      const page = await this.profiles.List(skip, pageSize, { WarehouseTypeCode: warehouseTypeCode });
      for (const profile of page.Items) {
        if (profile.Status === WarehouseProfileStatus.Active) {
          return profile;
        }
        if (firstOfType === null) {
          firstOfType = profile;
        }
      }
      skip += pageSize;
      if (skip >= page.TotalItems || page.Items.length === 0) {
        break;
      }
    }
    return firstOfType;
  }
}
