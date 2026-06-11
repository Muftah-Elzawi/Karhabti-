import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import type {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  RequestOtpInput,
  VerifyOtpInput,
} from '@karhabti/validation';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
} from '@karhabti/validation';

import { CurrentUser } from '../../../common/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import type { AuthResult, UserProfile } from '../application/auth.service';
import { AuthService } from '../application/auth.service';
import type { TokenPair } from '../application/token.service';
import type { AuthenticatedUser } from '../domain/token-payload';

/** Strict limit for credential/OTP endpoints: 5 requests / 15 min per IP. */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 15 * 60 * 1000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Register with phone + password; sends an OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'password', 'displayName'],
      properties: {
        phone: { type: 'string', example: '0912345678' },
        password: { type: 'string', minLength: 8 },
        displayName: { type: 'string', example: 'أحمد التريكي' },
      },
    },
  })
  register(@Body(new ZodValidationPipe(registerSchema)) input: RegisterInput) {
    return this.authService.register(input);
  }

  @Post('otp/request')
  @HttpCode(204)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Re-send the registration OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone'],
      properties: { phone: { type: 'string', example: '0912345678' } },
    },
  })
  async requestOtp(
    @Body(new ZodValidationPipe(requestOtpSchema)) input: RequestOtpInput,
  ): Promise<void> {
    await this.authService.requestOtp(input.phone);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Verify the OTP; marks the phone verified and signs in' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'code'],
      properties: {
        phone: { type: 'string', example: '0912345678' },
        code: { type: 'string', example: '123456' },
      },
    },
  })
  verifyOtp(
    @Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput,
  ): Promise<AuthResult> {
    return this.authService.verifyOtp(input);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Login with phone + password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phone', 'password'],
      properties: {
        phone: { type: 'string', example: '0912345678' },
        password: { type: 'string' },
      },
    },
  })
  login(@Body(new ZodValidationPipe(loginSchema)) input: LoginInput): Promise<AuthResult> {
    return this.authService.login(input);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the refresh token for a new token pair' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } },
    },
  })
  refresh(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
  ): Promise<TokenPair> {
    return this.authService.refresh(input.refreshToken);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke the presented refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } },
    },
  })
  async logout(
    @Body(new ZodValidationPipe(refreshTokenSchema)) input: RefreshTokenInput,
  ): Promise<void> {
    await this.authService.logout(input.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profile of the authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserProfile> {
    return this.authService.getProfile(user.id);
  }
}
