import { AuditContext } from '@modules/AccessControl/Application/DTOs/AuditContext';
import {
  CreateCycleCountWorkDto,
  CycleCountAdjustmentResultDto,
  CycleCountMutationResultDto,
  ListCycleCountWorksDto,
  ListCycleCountWorksResultDto,
  PostCycleCountAdjustmentDto,
  RecountCycleCountWorkDto,
  SubmitCycleCountWorkDto,
  UnlockCycleCountWorkDto,
} from '@modules/InventoryExecution/Application/DTOs/CycleCountWorkDto';
import { CycleCountWorkLifecycleService } from '@modules/InventoryExecution/Application/Services/CycleCountWorkLifecycleService';

export class CreateCycleCountWorkUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(request: CreateCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    return await this.lifecycle.Create(request, context);
  }
}

export class ListCycleCountWorksUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(query: ListCycleCountWorksDto): Promise<ListCycleCountWorksResultDto> {
    return await this.lifecycle.List(query);
  }
}

export class GetCycleCountWorkUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(id: string, context: AuditContext): Promise<CycleCountMutationResultDto> {
    return await this.lifecycle.Get(id, context);
  }
}

export class SubmitCycleCountWorkUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(request: SubmitCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    return await this.lifecycle.Submit(request, context);
  }
}

export class RecountCycleCountWorkUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(request: RecountCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    return await this.lifecycle.Recount(request, context);
  }
}

export class PostCycleCountAdjustmentUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(
    request: PostCycleCountAdjustmentDto,
    context: AuditContext,
  ): Promise<CycleCountAdjustmentResultDto> {
    return await this.lifecycle.PostAdjustment(request, context);
  }
}

export class UnlockCycleCountWorkUseCase {
  constructor(private readonly lifecycle: CycleCountWorkLifecycleService) {}

  public async Execute(request: UnlockCycleCountWorkDto, context: AuditContext): Promise<CycleCountMutationResultDto> {
    return await this.lifecycle.Unlock(request, context);
  }
}
