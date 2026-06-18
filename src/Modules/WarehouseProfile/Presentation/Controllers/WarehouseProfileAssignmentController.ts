import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateWarehouseProfileAssignmentUseCase } from '@modules/WarehouseProfile/Application/UseCases/CreateWarehouseProfileAssignmentUseCase';
import { ListWarehouseProfileAssignmentsUseCase } from '@modules/WarehouseProfile/Application/UseCases/ListWarehouseProfileAssignmentsUseCase';
import { CreateWarehouseProfileAssignmentRequest } from '@modules/WarehouseProfile/Presentation/Requests/CreateWarehouseProfileAssignmentRequest';
import { ListWarehouseProfileAssignmentsQuery } from '@modules/WarehouseProfile/Presentation/Requests/ListWarehouseProfileAssignmentsQuery';

@Controller('warehouse-profiles/:id/assignments')
export class WarehouseProfileAssignmentController {
  constructor(
    private readonly createWarehouseProfileAssignmentUseCase: CreateWarehouseProfileAssignmentUseCase,
    private readonly listWarehouseProfileAssignmentsUseCase: ListWarehouseProfileAssignmentsUseCase,
  ) {}

  @Post()
  public async Create(@Param('id') id: string, @Body() request: CreateWarehouseProfileAssignmentRequest) {
    return await this.createWarehouseProfileAssignmentUseCase.Execute({ WarehouseProfileId: id, ...request });
  }

  @Get()
  public async List(@Param('id') id: string, @Query() query: ListWarehouseProfileAssignmentsQuery) {
    return await this.listWarehouseProfileAssignmentsUseCase.Execute(id, query);
  }
}
