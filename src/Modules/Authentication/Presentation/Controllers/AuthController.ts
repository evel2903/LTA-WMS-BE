import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Role } from '../../../../Common/Constants/Role';
import { Roles } from '../../../../Common/Security/Roles';
import { RolesGuard } from '../../../../Common/Security/RolesGuard';
import { LoginUseCase } from '../../Application/UseCases/LoginUseCase';
import { RegisterUseCase } from '../../Application/UseCases/RegisterUseCase';
import { JwtAuthGuard } from '../Guards/JwtAuthGuard';
import { JwtUser } from '../../Infrastructure/Jwt/JwtStrategy';
import { LoginRequest } from '../Requests/LoginRequest';
import { RegisterRequest } from '../Requests/RegisterRequest';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  @Post('register')
  public async Register(@Body() request: RegisterRequest) {
    return await this.registerUseCase.Execute(request);
  }

  @Post('login')
  public async Login(@Body() request: LoginRequest) {
    return await this.loginUseCase.Execute(request);
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
}
