import { Body, Controller, Post } from '@nestjs/common';
import { EnqueueExampleJobUseCase } from '../../Application/UseCases/EnqueueExampleJobUseCase';
import { EnqueueExampleRequest } from '../Requests/EnqueueExampleRequest';

@Controller('jobs')
export class JobsController {
  constructor(private readonly enqueueExampleJobUseCase: EnqueueExampleJobUseCase) {}

  @Post('example')
  public async Enqueue(@Body() request: EnqueueExampleRequest) {
    return await this.enqueueExampleJobUseCase.Execute({ Message: request.Message });
  }
}
