import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Request, Response } from 'express';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@modules/Authentication/AuthConstants';
import { IssuedTokens } from '@modules/Authentication/Application/DTOs/AuthResultDto';

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  public SetAuthCookies(response: Response, tokens: IssuedTokens): void {
    response.cookie(ACCESS_TOKEN_COOKIE, tokens.AccessToken, this.BuildOptions(tokens.AccessTokenExpiresInMs));
    response.cookie(REFRESH_TOKEN_COOKIE, tokens.RefreshToken, this.BuildOptions(tokens.RefreshTokenExpiresInMs));
  }

  public ClearAuthCookies(response: Response): void {
    const options = this.BuildOptions();
    response.clearCookie(ACCESS_TOKEN_COOKIE, options);
    response.clearCookie(REFRESH_TOKEN_COOKIE, options);
  }

  public GetRefreshToken(request: Request): string | undefined {
    const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private BuildOptions(maxAgeMs?: number): CookieOptions {
    const isProduction = (this.configService.get<string>('App.NodeEnv') ?? 'development') === 'production';
    const options: CookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    };

    if (maxAgeMs !== undefined) {
      options.maxAge = maxAgeMs;
    }

    return options;
  }
}
