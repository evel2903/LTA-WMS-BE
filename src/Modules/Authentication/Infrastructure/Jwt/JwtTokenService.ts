import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload, ITokenService, TokenPair } from '../../Domain/Interfaces/ITokenService';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async SignAccessToken(payload: AccessTokenPayload): Promise<TokenPair> {
    const expiresIn = this.configService.get<string>('Jwt.Expiration');
    const token = await this.jwtService.signAsync(
      {
        sub: payload.Sub,
        email: payload.EmailAddress,
        role: payload.Role,
      },
      { expiresIn },
    );

    return { AccessToken: token, ExpiresIn: expiresIn ?? '' };
  }
}
