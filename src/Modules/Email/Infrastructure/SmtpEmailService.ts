import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { IEmailService, SendEmailRequest } from '../Domain/Interfaces/IEmailService';

@Injectable()
export class SmtpEmailService implements IEmailService {
  constructor(private readonly configService: ConfigService) {}

  public async Send(request: SendEmailRequest): Promise<void> {
    const host = this.configService.get<string>('Email.Host');
    const port = this.configService.get<number>('Email.Port') ?? 587;
    const secure = this.configService.get<boolean>('Email.Secure') ?? false;
    const username = this.configService.get<string>('Email.Username');
    const password = this.configService.get<string>('Email.Password');
    const from = this.configService.get<string>('Email.From');

    if (!host || !from) {
      // No SMTP configured: no-op (safe default for seed project).
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: username && password ? { user: username, pass: password } : undefined,
    });

    await transporter.sendMail({
      from,
      to: request.To,
      subject: request.Subject,
      text: request.Text,
      html: request.Html,
    });
  }
}
