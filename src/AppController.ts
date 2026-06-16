import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  public GetHealth(): { Status: 'OK' } {
    return { Status: 'OK' };
  }
}
