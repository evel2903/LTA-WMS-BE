import { Module } from '@nestjs/common';
import { EMAIL_SERVICE, IEmailService } from '@modules/Email/Application/Interfaces/IEmailService';
import { SmtpEmailService } from '@modules/Email/Infrastructure/SmtpEmailService';
import { SendEmailUseCase } from '@modules/Email/Application/UseCases/SendEmailUseCase';

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
