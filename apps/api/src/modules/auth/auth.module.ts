import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './application/auth.service';
import { OtpService } from './application/otp.service';
import { TokenService } from './application/token.service';
import { OtpRepository } from './infrastructure/otp.repository';
import { RefreshTokenRepository } from './infrastructure/refresh-token.repository';
import { UserRepository } from './infrastructure/user.repository';
import { AuthController } from './presentation/auth.controller';

@Module({
  // Secrets are passed per-call from validated config (see TokenService /
  // JwtAuthGuard); global so guards anywhere can inject JwtService.
  imports: [JwtModule.register({ global: true })],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    OtpService,
    UserRepository,
    RefreshTokenRepository,
    OtpRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
