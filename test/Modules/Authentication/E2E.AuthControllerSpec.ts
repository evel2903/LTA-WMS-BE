import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from '@modules/Authentication/Presentation/Controllers/AuthController';
import { LoginUseCase } from '@modules/Authentication/Application/UseCases/LoginUseCase';
import { RegisterUseCase } from '@modules/Authentication/Application/UseCases/RegisterUseCase';
import { RefreshTokenUseCase } from '@modules/Authentication/Application/UseCases/RefreshTokenUseCase';
import { LogoutUseCase } from '@modules/Authentication/Application/UseCases/LogoutUseCase';
import { LogoutAllUseCase } from '@modules/Authentication/Application/UseCases/LogoutAllUseCase';
import { AuthCookieService } from '@modules/Authentication/Presentation/Cookies/AuthCookieService';
import { GlobalExceptionFilter } from '@common/Filters/GlobalExceptionFilter';
import { LoggingService } from '@common/Logging/LoggingService';

const authResult = {
  Tokens: {
    AccessToken: 'access-token',
    AccessTokenExpiresInMs: 900000,
    RefreshToken: 'refresh-token',
    RefreshTokenExpiresInMs: 604800000,
  },
  User: { Id: 'u1', EmailAddress: 'a@b.com', Role: 'User' },
};

describe('E2E AuthController (cookies, no DB)', () => {
  let app: INestApplication;
  const loginExecute = jest.fn();
  const registerExecute = jest.fn();
  const refreshExecute = jest.fn();
  const logoutExecute = jest.fn();
  const logoutAllExecute = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginUseCase, useValue: { Execute: loginExecute } },
        { provide: RegisterUseCase, useValue: { Execute: registerExecute } },
        { provide: RefreshTokenUseCase, useValue: { Execute: refreshExecute } },
        { provide: LogoutUseCase, useValue: { Execute: logoutExecute } },
        { provide: LogoutAllUseCase, useValue: { Execute: logoutAllExecute } },
        AuthCookieService,
        { provide: ConfigService, useValue: { get: () => 'test' } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalFilters(new GlobalExceptionFilter({ LogError: jest.fn() } as unknown as LoggingService));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    loginExecute.mockReset();
    registerExecute.mockReset();
    refreshExecute.mockReset();
    logoutExecute.mockReset();
    logoutAllExecute.mockReset();
  });

  it('POST /auth/login returns 400 on invalid body', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({ EmailAddress: 'not-an-email' }).expect(400);
    expect(loginExecute).not.toHaveBeenCalled();
  });

  it('POST /auth/login sets HttpOnly cookies and returns user (no tokens in body)', async () => {
    loginExecute.mockResolvedValue(authResult);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ EmailAddress: 'a@b.com', Password: 'pw' })
      .expect(201);

    expect(loginExecute).toHaveBeenCalledWith({ EmailAddress: 'a@b.com', Password: 'pw' });
    expect(response.body.User).toEqual({ Id: 'u1', EmailAddress: 'a@b.com', Role: 'User' });
    expect(response.body.AccessToken).toBeUndefined();
    expect(response.body.RefreshToken).toBeUndefined();

    const cookies = response.get('Set-Cookie') ?? [];
    const access = cookies.find((c) => c.startsWith('access_token='));
    const refresh = cookies.find((c) => c.startsWith('refresh_token='));
    expect(access).toContain('HttpOnly');
    expect(refresh).toContain('HttpOnly');
    expect(access).toContain('access-token');
    expect(refresh).toContain('refresh-token');
  });

  it('POST /auth/register sets cookies', async () => {
    registerExecute.mockResolvedValue(authResult);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ FirstName: 'A', LastName: 'B', EmailAddress: 'a@b.com', Password: 'pw' })
      .expect(201);

    const cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('POST /auth/refresh without cookie returns 401', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    expect(refreshExecute).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh reads refresh_token cookie and re-issues cookies', async () => {
    refreshExecute.mockResolvedValue(authResult);

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', ['refresh_token=incoming-refresh'])
      .expect(200);

    expect(refreshExecute).toHaveBeenCalledWith('incoming-refresh');
    const cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.some((c) => c.startsWith('access_token='))).toBe(true);
  });

  it('POST /auth/logout revokes the presented refresh token and clears cookies', async () => {
    logoutExecute.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', ['refresh_token=to-revoke'])
      .expect(200);

    expect(logoutExecute).toHaveBeenCalledWith('to-revoke');
    expect(response.body.Ok).toBe(true);
    const cookies = response.get('Set-Cookie') ?? [];
    expect(cookies.some((c) => c.startsWith('access_token=;'))).toBe(true);
    expect(cookies.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
  });
});
