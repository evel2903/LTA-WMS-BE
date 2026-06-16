import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../Users/UserModule';
import { IUserRepository, USER_REPOSITORY } from '../Users/Domain/Interfaces/IUserRepository';
import { IPasswordHasher, PASSWORD_HASHER } from './Domain/Interfaces/IPasswordHasher';
import { ITokenService, TOKEN_SERVICE } from './Domain/Interfaces/ITokenService';
import { LoginUseCase } from './Application/UseCases/LoginUseCase';
import { RegisterUseCase } from './Application/UseCases/RegisterUseCase';
import { BcryptPasswordHasher } from './Infrastructure/Security/BcryptPasswordHasher';
import { JwtTokenService } from './Infrastructure/Jwt/JwtTokenService';
import { JwtStrategy } from './Infrastructure/Jwt/JwtStrategy';
import { AuthController } from './Presentation/Controllers/AuthController';
import { RolesGuard } from '../../Common/Security/RolesGuard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('Jwt.Secret');
        const expiresIn = configService.get<string>('Jwt.Expiration');
        return { secret, signOptions: { expiresIn } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SERVICE, useClass: JwtTokenService },
    Reflector,
    RolesGuard,
    {
      provide: RegisterUseCase,
      useFactory: (repo: IUserRepository, hasher: IPasswordHasher, token: ITokenService) =>
        new RegisterUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
    {
      provide: LoginUseCase,
      useFactory: (repo: IUserRepository, hasher: IPasswordHasher, token: ITokenService) =>
        new LoginUseCase(repo, hasher, token),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
    },
  ],
})
export class AuthenticationModule {}
