import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ParseDurationToMs } from '@common/Helpers/Duration';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';
import { Role } from '@common/Constants/Role';
import {
  AccessTokenPayload,
  ITokenService,
  SignedToken,
} from '@modules/Authentication/Application/Interfaces/ITokenService';

type RawTokenPayload = { sub: string; email: string; role: Role; type: 'access' | 'refresh'; jti?: string };

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async SignAccessToken(payload: AccessTokenPayload): Promise<SignedToken> {
    const expiresIn = this.configService.get<string>('Jwt.Expiration') ?? '15m';
    const token = await this.jwtService.signAsync(this.BuildPayload(payload, 'access'), {
      secret: this.configService.get<string>('Jwt.Secret'),
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    });

    return { Token: token, ExpiresInMs: ParseDurationToMs(expiresIn) };
  }

  public async SignRefreshToken(payload: AccessTokenPayload): Promise<SignedToken> {
    const expiresIn = this.configService.get<string>('Jwt.RefreshExpiration') ?? '7d';
    const token = await this.jwtService.signAsync(
      { ...this.BuildPayload(payload, 'refresh'), jti: randomUUID() },
      {
        secret: this.configService.get<string>('Jwt.RefreshSecret'),
        expiresIn: expiresIn as JwtSignOptions['expiresIn'],
      },
    );

    return { Token: token, ExpiresInMs: ParseDurationToMs(expiresIn) };
  }

  public async VerifyRefreshToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RawTokenPayload>(token, {
        secret: this.configService.get<string>('Jwt.RefreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedAppException('Invalid refresh token');
      }

      return { Sub: payload.sub, EmailAddress: payload.email, Role: payload.role };
    } catch (error) {
      if (error instanceof UnauthorizedAppException) {
        throw error;
      }
      throw new UnauthorizedAppException('Invalid or expired refresh token');
    }
  }

  private BuildPayload(payload: AccessTokenPayload, type: 'access' | 'refresh'): RawTokenPayload {
    return { sub: payload.Sub, email: payload.EmailAddress, role: payload.Role, type };
  }
}
