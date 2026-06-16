import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { SmtpEmailService } from '../../../src/Modules/Email/Infrastructure/SmtpEmailService';

type Transporter = { sendMail: (args: unknown) => Promise<unknown> };

const sendMail = jest.fn<Promise<unknown>, [unknown]>();

jest.mock('nodemailer', () => {
  return {
    __esModule: true,
    default: {
      createTransport: jest.fn((): Transporter => ({ sendMail })),
    },
  };
});

describe('SmtpEmailService', () => {
  beforeEach(() => {
    sendMail.mockReset();
    (nodemailer.createTransport as unknown as jest.Mock).mockClear();
  });

  it('is a no-op when SMTP is not configured', async () => {
    const configService = { get: () => undefined } as unknown as ConfigService;
    const service = new SmtpEmailService(configService);

    await service.Send({ To: 'a@b.com', Subject: 'S' });

    expect(nodemailer.createTransport).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends email when SMTP is configured', async () => {
    const configService = {
      get: (key: string) => {
        if (key === 'Email.Host') return 'smtp.example.com';
        if (key === 'Email.Port') return 587;
        if (key === 'Email.Secure') return false;
        if (key === 'Email.Username') return 'u';
        if (key === 'Email.Password') return 'p';
        if (key === 'Email.From') return 'noreply@example.com';
        return undefined;
      },
    } as unknown as ConfigService;

    const service = new SmtpEmailService(configService);
    await service.Send({ To: 'a@b.com', Subject: 'Hi', Text: 'T', Html: '<b>H</b>' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'u', pass: 'p' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'a@b.com',
        subject: 'Hi',
        text: 'T',
        html: '<b>H</b>',
      }),
    );
  });
});
