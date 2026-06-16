import { IEmailService, SendEmailRequest } from '@modules/Email/Application/Interfaces/IEmailService';

export class SendEmailUseCase {
  constructor(private readonly emailService: IEmailService) {}

  public async Execute(request: SendEmailRequest): Promise<void> {
    await this.emailService.Send(request);
  }
}
