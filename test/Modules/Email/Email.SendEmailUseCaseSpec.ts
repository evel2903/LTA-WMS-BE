import { SendEmailUseCase } from '../../../src/Modules/Email/Application/UseCases/SendEmailUseCase';
import { IEmailService, SendEmailRequest } from '../../../src/Modules/Email/Domain/Interfaces/IEmailService';

class FakeEmailService implements IEmailService {
  public Send = jest.fn<Promise<void>, [SendEmailRequest]>();
}

describe('SendEmailUseCase', () => {
  it('delegates to email service', async () => {
    const service = new FakeEmailService();
    const useCase = new SendEmailUseCase(service);

    await useCase.Execute({ To: 'a@b.com', Subject: 'Hello', Text: 'Hi' });
    expect(service.Send).toHaveBeenCalledWith({ To: 'a@b.com', Subject: 'Hello', Text: 'Hi' });
  });
});
