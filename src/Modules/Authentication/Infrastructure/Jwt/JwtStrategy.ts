import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../../../Common/Constants/Role';

export type JwtUser = { UserId: string; EmailAddress: string; Role: Role };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('Jwt.Secret');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  public async validate(payload: { sub: string; email: string; role: Role }): Promise<JwtUser> {
    return { UserId: payload.sub, EmailAddress: payload.email, Role: payload.role };
  }
}
