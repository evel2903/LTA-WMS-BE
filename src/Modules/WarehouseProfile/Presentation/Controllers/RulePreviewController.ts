import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PreviewRuleResolutionInput } from '@modules/WarehouseProfile/Application/DTOs/PreviewRuleResolutionDto';
import { PreviewRuleResolutionUseCase } from '@modules/WarehouseProfile/Application/UseCases/PreviewRuleResolutionUseCase';
import { PreviewRuleResolutionRequest } from '@modules/WarehouseProfile/Presentation/Requests/PreviewRuleResolutionRequest';

/**
 * Read-only rule preview/simulation endpoint (B4). POST because the simulation context is a complex
 * body, not a mutation — consistent with the architecture 7.1 `/rules/resolve` grouping. A separate
 * controller from `/rule-definitions` keeps preview decoupled from rule CRUD.
 *
 * The controller only adapts the validated request to the use case input (converting EvaluatedAt to
 * a Date); it never touches the resolver / repositories directly and persists nothing.
 */
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('rules')
export class RulePreviewController {
  constructor(private readonly previewRuleResolutionUseCase: PreviewRuleResolutionUseCase) {}

  @Post('preview')
  @RequirePermission(ActionCode.Read, ObjectType.Rule)
  public async Preview(@Body() request: PreviewRuleResolutionRequest) {
    const input: PreviewRuleResolutionInput = {
      WarehouseTypeCode: request.WarehouseTypeCode,
      WarehouseId: request.WarehouseId,
      ZoneId: request.ZoneId,
      LocationType: request.LocationType,
      OwnerId: request.OwnerId,
      SkuId: request.SkuId,
      ItemClass: request.ItemClass,
      OrderType: request.OrderType,
      CustomerId: request.CustomerId,
      SupplierId: request.SupplierId,
      ActorUserId: request.ActorUserId,
      Action: request.Action,
      ObjectType: request.ObjectType,
      ObjectId: request.ObjectId,
      ReasonCode: request.ReasonCode,
      EvaluatedAt: request.EvaluatedAt != null ? new Date(request.EvaluatedAt) : undefined,
      Attributes: request.Attributes,
    };

    return await this.previewRuleResolutionUseCase.Execute(input);
  }
}
