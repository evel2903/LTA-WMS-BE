import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import { ActionCode } from '@modules/AccessControl/Domain/Enums/ActionCode';
import { ObjectType } from '@modules/AccessControl/Domain/Enums/ObjectType';
import { CurrentAuditContext } from '@modules/AccessControl/Presentation/Decorators/CurrentAuditContext';
import { RequirePermission } from '@modules/AccessControl/Presentation/Decorators/RequirePermission';
import { PermissionGuard } from '@modules/AccessControl/Presentation/Guards/PermissionGuard';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import {
  CreateCycleCountWorkUseCase,
  GetCycleCountWorkUseCase,
  ListCycleCountWorksUseCase,
  PostCycleCountAdjustmentUseCase,
  RecountCycleCountWorkUseCase,
  SubmitCycleCountWorkUseCase,
  UnlockCycleCountWorkUseCase,
} from '@modules/InventoryExecution/Application/UseCases/CycleCountWorkUseCases';
import { CreateCycleCountWorkRequest } from '@modules/InventoryExecution/Presentation/Requests/CreateCycleCountWorkRequest';
import { CycleCountReasonedRequest } from '@modules/InventoryExecution/Presentation/Requests/CycleCountReasonedRequest';
import { ListCycleCountWorksQuery } from '@modules/InventoryExecution/Presentation/Requests/ListCycleCountWorksQuery';
import { PostCycleCountAdjustmentRequest } from '@modules/InventoryExecution/Presentation/Requests/PostCycleCountAdjustmentRequest';
import { SubmitCycleCountWorkRequest } from '@modules/InventoryExecution/Presentation/Requests/SubmitCycleCountWorkRequest';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('cycle-count/works')
export class CycleCountWorkController {
  constructor(
    private readonly createCycleCountWorkUseCase: CreateCycleCountWorkUseCase,
    private readonly listCycleCountWorksUseCase: ListCycleCountWorksUseCase,
    private readonly getCycleCountWorkUseCase: GetCycleCountWorkUseCase,
    private readonly submitCycleCountWorkUseCase: SubmitCycleCountWorkUseCase,
    private readonly recountCycleCountWorkUseCase: RecountCycleCountWorkUseCase,
    private readonly postCycleCountAdjustmentUseCase: PostCycleCountAdjustmentUseCase,
    private readonly unlockCycleCountWorkUseCase: UnlockCycleCountWorkUseCase,
  ) {}

  @Post()
  @RequirePermission(ActionCode.Create, ObjectType.CycleCount)
  public async Create(@Body() request: CreateCycleCountWorkRequest, @CurrentAuditContext() context: AuditContext) {
    return await this.createCycleCountWorkUseCase.Execute(request, context);
  }

  @Get()
  @RequirePermission(ActionCode.Read, ObjectType.CycleCount, {
    WarehouseId: { In: 'query', Key: 'WarehouseId' },
    OwnerId: { In: 'query', Key: 'OwnerId' },
  })
  public async List(@Query() query: ListCycleCountWorksQuery, @CurrentAuditContext() context: AuditContext) {
    return await this.listCycleCountWorksUseCase.Execute({ ...query, ActorUserId: context.ActorUserId });
  }

  @Get(':id')
  @RequirePermission(ActionCode.Read, ObjectType.CycleCount)
  public async GetById(@Param('id') id: string, @CurrentAuditContext() context: AuditContext) {
    return await this.getCycleCountWorkUseCase.Execute(id, context);
  }

  @Post(':id/submit')
  @RequirePermission(ActionCode.Update, ObjectType.CycleCount)
  public async Submit(
    @Param('id') id: string,
    @Body() request: SubmitCycleCountWorkRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.submitCycleCountWorkUseCase.Execute({ WorkId: id, ...request }, context);
  }

  @Post(':id/recount')
  @RequirePermission(ActionCode.Update, ObjectType.CycleCount)
  public async Recount(
    @Param('id') id: string,
    @Body() request: CycleCountReasonedRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.recountCycleCountWorkUseCase.Execute({ WorkId: id, ...request }, context);
  }

  @Post(':id/adjustment')
  @RequirePermission(ActionCode.Adjust, ObjectType.CycleCount)
  public async PostAdjustment(
    @Param('id') id: string,
    @Body() request: PostCycleCountAdjustmentRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.postCycleCountAdjustmentUseCase.Execute({ WorkId: id, ...request }, context);
  }

  @Post(':id/unlock')
  @RequirePermission(ActionCode.Unlock, ObjectType.CycleCount)
  public async Unlock(
    @Param('id') id: string,
    @Body() request: CycleCountReasonedRequest,
    @CurrentAuditContext() context: AuditContext,
  ) {
    return await this.unlockCycleCountWorkUseCase.Execute({ WorkId: id, ...request }, context);
  }
}
