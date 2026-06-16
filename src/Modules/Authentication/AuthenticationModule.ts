import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@modules/Users/UserModule';
import { IUserRepository, USER_REPOSITORY } from '@modules/Users/Application/Interfaces/IUserRepository';
import { IPasswordHasher, PASSWORD_HASHER } from '@modules/Authentication/Application/Interfaces/IPasswordHasher';
import { ITokenService, TOKEN_SERVICE } from '@modules/Authentication/Application/Interfaces/ITokenService';
import {
  IRefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
} from '@modules/Authentication/Application/Interfaces/IRefreshTokenRepository';
import { LoginUseCase } from '@modules/Authentication/Application/UseCases/LoginUseCase';
import { RegisterUseCase } from '@modules/Authentication/Application/UseCases/RegisterUseCase';
import { RefreshTokenUseCase } from '@modules/Authentication/Application/UseCases/RefreshTokenUseCase';
import { LogoutUseCase } from '@modules/Authentication/Application/UseCases/LogoutUseCase';
import { LogoutAllUseCase } from '@modules/Authentication/Application/UseCases/LogoutAllUseCase';
import { BcryptPasswordHasher } from '@modules/Authentication/Infrastructure/Security/BcryptPasswordHasher';
import { JwtTokenService } from '@modules/Authentication/Infrastructure/Jwt/JwtTokenService';
import { JwtStrategy } from '@modules/Authentication/Infrastructure/Jwt/JwtStrategy';
import { RefreshTokenOrmEntity } from '@modules/Authentication/Infrastructure/Persistence/Entities/RefreshTokenOrmEntity';
import { RefreshTokenRepository } from '@modules/Authentication/Infrastructure/Persistence/Repositories/RefreshTokenRepository';
import { AuthController } from '@modules/Authentication/Presentation/Controllers/AuthController';
import { AuthCookieService } from '@modules/Authentication/Presentation/Cookies/AuthCookieService';
import { RolesGuard } from '@common/Security/RolesGuard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([RefreshTokenOrmEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('Jwt.Secret');
        const expiresIn = configService.get<string>('Jwt.Expiration') as JwtSignOptions['expiresIn'];
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    AuthCookieService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
    Reflector,
    RolesGuard,
    {
      provide: RegisterUseCase,
      useFactory: (
        repo: IUserRepository,
        hasher: IPasswordHasher,
        token: ITokenService,
        refreshRepo: IRefreshTokenRepository,
      ) => new RegisterUseCase(repo, hasher, token, refreshRepo),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, REFRESH_TOKEN_REPOSITORY],
    },
    {
      provide: LoginUseCase,
      useFactory: (
        repo: IUserRepository,
        hasher: IPasswordHasher,
        token: ITokenService,
        refreshRepo: IRefreshTokenRepository,
      ) => new LoginUseCase(repo, hasher, token, refreshRepo),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE, REFRESH_TOKEN_REPOSITORY],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (repo: IUserRepository, token: ITokenService, refreshRepo: IRefreshTokenRepository) =>
        new RefreshTokenUseCase(repo, token, refreshRepo),
      inject: [USER_REPOSITORY, TOKEN_SERVICE, REFRESH_TOKEN_REPOSITORY],
    },
    {
      provide: LogoutUseCase,
      useFactory: (refreshRepo: IRefreshTokenRepository) => new LogoutUseCase(refreshRepo),
      inject: [REFRESH_TOKEN_REPOSITORY],
    },
    {
      provide: LogoutAllUseCase,
      useFactory: (refreshRepo: IRefreshTokenRepository) => new LogoutAllUseCase(refreshRepo),
      inject: [REFRESH_TOKEN_REPOSITORY],
    },
  ],
})
export class AuthenticationModule {}
