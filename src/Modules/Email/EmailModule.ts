import { Module } from '@nestjs/common';
import { EMAIL_SERVICE, IEmailService } from './Domain/Interfaces/IEmailService';
import { SmtpEmailService } from './Infrastructure/SmtpEmailService';
import { SendEmailUseCase } from './Application/UseCases/SendEmailUseCase';

@Module({
  providers: [
    { provide: EMAIL_SERVICE, useClass: SmtpEmailService },
    {
      provide: SendEmailUseCase,
      useFactory: (service: IEmailService) => new SendEmailUseCase(service),
      inject: [EMAIL_SERVICE],
    },
  ],
  exports: [EMAIL_SERVICE, SendEmailUseCase],
})
export class EmailModule {}
