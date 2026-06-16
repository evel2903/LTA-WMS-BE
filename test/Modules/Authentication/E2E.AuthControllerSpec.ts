import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AuthController } from '../../../src/Modules/Authentication/Presentation/Controllers/AuthController';
import { LoginUseCase } from '../../../src/Modules/Authentication/Application/UseCases/LoginUseCase';
import { RegisterUseCase } from '../../../src/Modules/Authentication/Application/UseCases/RegisterUseCase';

describe('E2E AuthController (no DB)', () => {
  let app: INestApplication;
  const loginExecute = jest.fn();
  const registerExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: { Execute: loginExecute } },
        { provide: RegisterUseCase, useValue: { Execute: registerExecute } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    loginExecute.mockReset();
    registerExecute.mockReset();
  });

  it('POST /auth/login returns 400 on invalid body', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ EmailAddress: 'not-an-email' }).expect(400);
    expect(loginExecute).not.toHaveBeenCalled();
  });

  it('POST /auth/login calls use case on valid body', async () => {
    loginExecute.mockResolvedValue({ AccessToken: 't', ExpiresIn: '1h', User: { Id: 'u1', EmailAddress: 'a@b.com' } });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ EmailAddress: 'a@b.com', Password: 'pw' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.AccessToken).toBe('t');
      });

    expect(loginExecute).toHaveBeenCalledWith({ EmailAddress: 'a@b.com', Password: 'pw' });
  });

  it('POST /auth/register calls use case on valid body', async () => {
    registerExecute.mockResolvedValue({
      AccessToken: 't',
      ExpiresIn: '1h',
      User: { Id: 'u1', EmailAddress: 'a@b.com' },
    });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com', Password: 'pw' })
      .expect(201);

    expect(registerExecute).toHaveBeenCalledWith({
      FirstName: 'A',
      LastName: 'B',
      EmailAddress: 'a@b.com',
      Password: 'pw',
    });
  });
});
