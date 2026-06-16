import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@common/Constants/Role';
import { ACCESS_TOKEN_COOKIE } from '@modules/Authentication/AuthConstants';

export type JwtUser = { UserId: string; EmailAddress: string; Role: Role };

const ExtractAccessTokenFromCookie = (request: Request): string | null => {
  const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[ACCESS_TOKEN_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('Jwt.Secret');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractAccessTokenFromCookie]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  public async validate(payload: { sub: string; email: string; role: Role }): Promise<JwtUser> {
    return { UserId: payload.sub, EmailAddress: payload.email, Role: payload.role };
  }
}
