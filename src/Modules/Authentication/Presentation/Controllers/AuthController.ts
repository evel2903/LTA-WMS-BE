import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Role } from '@common/Constants/Role';
import { Roles } from '@common/Security/Roles';
import { RolesGuard } from '@common/Security/RolesGuard';
import { UnauthorizedAppException } from '@common/Exceptions/AppException';
import { LoginUseCase } from '@modules/Authentication/Application/UseCases/LoginUseCase';
import { RegisterUseCase } from '@modules/Authentication/Application/UseCases/RegisterUseCase';
import { RefreshTokenUseCase } from '@modules/Authentication/Application/UseCases/RefreshTokenUseCase';
import { LogoutUseCase } from '@modules/Authentication/Application/UseCases/LogoutUseCase';
import { LogoutAllUseCase } from '@modules/Authentication/Application/UseCases/LogoutAllUseCase';
import { AuthResultDto } from '@modules/Authentication/Application/DTOs/AuthResultDto';
import { AuthCookieService } from '@modules/Authentication/Presentation/Cookies/AuthCookieService';
import { JwtAuthGuard } from '@modules/Authentication/Presentation/Guards/JwtAuthGuard';
import { JwtUser } from '@modules/Authentication/Infrastructure/Jwt/JwtStrategy';
import { LoginRequest } from '@modules/Authentication/Presentation/Requests/LoginRequest';
import { RegisterRequest } from '@modules/Authentication/Presentation/Requests/RegisterRequest';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly logoutAllUseCase: LogoutAllUseCase,
    private readonly cookieService: AuthCookieService,
  ) {}

  @Post('register')
  public async Register(@Body() request: RegisterRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.registerUseCase.Execute(request);
    return this.SetCookiesAndRespond(response, result);
  }

  @Post('login')
  public async Login(@Body() request: LoginRequest, @Res({ passthrough: true }) response: Response) {
    const result = await this.loginUseCase.Execute(request);
    return this.SetCookiesAndRespond(response, result);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async Refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const refreshToken = this.cookieService.GetRefreshToken(request);
    if (!refreshToken) {
      throw new UnauthorizedAppException('Missing refresh token');
    }

    const result = await this.refreshTokenUseCase.Execute(refreshToken);
    return this.SetCookiesAndRespond(response, result);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async Logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.logoutUseCase.Execute(this.cookieService.GetRefreshToken(request));
    this.cookieService.ClearAuthCookies(response);
    return { Ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  public async LogoutAll(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const user = (request as Request & { user: JwtUser }).user;
    await this.logoutAllUseCase.Execute(user.UserId);
    this.cookieService.ClearAuthCookies(response);
    return { Ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  public async Me(@Req() request: Request) {
    const user = (request as Request & { user: JwtUser }).user;
    return { UserId: user.UserId, EmailAddress: user.EmailAddress, Role: user.Role };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin')
  public async AdminOnly() {
    return { Ok: true };
  }

  private SetCookiesAndRespond(response: Response, result: AuthResultDto) {
    this.cookieService.SetAuthCookies(response, result.Tokens);
    return { User: result.User };
  }
}
