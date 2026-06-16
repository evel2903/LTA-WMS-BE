export type SendEmailRequest = {
  To: string;
  Subject: string;
  Text?: string;
  Html?: string;
};

export const EMAIL_SERVICE = Symbol('IEmailService');

export interface IEmailService {
  Send(request: SendEmailRequest): Promise<void>;
}
