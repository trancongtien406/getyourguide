import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AdminResetUserPasswordDto } from './dto/admin-reset-user-password.dto';
import { BulkUserLifecycleActionDto } from './dto/bulk-user-lifecycle-action.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserLifecycleActionDto } from './dto/user-lifecycle-action.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
import { UserManagementService } from './user-management.service';

const REFRESH_COOKIE = 'refreshToken';

@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly userManagementService: UserManagementService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  /** Set HttpOnly cookie with the refresh token */
  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/auth',          // only sent to /auth/* endpoints
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }

  /** Clear the refresh token cookie */
  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: this.isProduction ? 'strict' : 'lax',
      path: '/auth',
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return rest; // { accessToken, user }
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return rest; // { accessToken, user }
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('No refresh token');
    }
    const { refreshToken, ...rest } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return rest; // { accessToken, user }
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.clearRefreshCookie(res);
    return this.authService.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/send-verification')
  sendEmailVerification(@CurrentUser() user: JwtPayload) {
    return this.authService.sendEmailVerification(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('email/verify')
  verifyEmail(@CurrentUser() user: JwtPayload, @Body('otp') otp: string) {
    return this.authService.verifyEmail(user.sub, otp);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/suppliers')
  getMySuppliers(@CurrentUser() user: JwtPayload) {
    return this.authService.getMySuppliers(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Get('users')
  listUsers(@CurrentUser() user: JwtPayload, @Query() query: ListUsersDto) {
    return this.userManagementService.listUsers(user, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Get('users/:id')
  getUserById(@CurrentUser() user: JwtPayload, @Param('id') userId: string) {
    return this.userManagementService.getUserById(user, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Post('users')
  createUser(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
    return this.userManagementService.createUser(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/:id')
  updateUserById(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userManagementService.updateUserById(user, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/bulk/lock')
  lockUsersBulk(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkUserLifecycleActionDto,
  ) {
    return this.userManagementService.lockUsersBulk(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/bulk/unlock')
  unlockUsersBulk(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkUserLifecycleActionDto,
  ) {
    return this.userManagementService.unlockUsersBulk(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Delete('users/bulk')
  softDeleteUsersBulk(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkUserLifecycleActionDto,
  ) {
    return this.userManagementService.softDeleteUsersBulk(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/bulk/restore')
  restoreUsersBulk(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkUserLifecycleActionDto,
  ) {
    return this.userManagementService.restoreUsersBulk(user, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/:id/lock')
  lockUserById(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UserLifecycleActionDto,
  ) {
    return this.userManagementService.lockUserById(user, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/:id/unlock')
  unlockUserById(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UserLifecycleActionDto,
  ) {
    return this.userManagementService.unlockUserById(user, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Delete('users/:id')
  softDeleteUserById(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UserLifecycleActionDto,
  ) {
    return this.userManagementService.softDeleteUserById(user, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/:id/restore')
  restoreUserById(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UserLifecycleActionDto,
  ) {
    return this.userManagementService.restoreUserById(user, userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.SUPPLIER_ADMIN)
  @Patch('users/:id/reset-password')
  resetUserPasswordByAdmin(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: AdminResetUserPasswordDto,
  ) {
    return this.userManagementService.resetUserPasswordByAdmin(user, userId, dto);
  }
}
