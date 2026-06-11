import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import * as argon2 from 'argon2';

import type { LoginInput, RegisterInput, VerifyOtpInput } from '@karhabti/validation';

import { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { TokenPair } from './token.service';
import { hashToken, TokenService } from './token.service';
import { OtpService } from './otp.service';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { UserRepository } from '../infrastructure/user.repository';

export interface UserProfile {
  id: string;
  phone: string;
  displayName: string;
  role: User['role'];
  locale: User['locale'];
  isPhoneVerified: boolean;
  createdAt: Date;
}

export interface AuthResult extends TokenPair {
  user: UserProfile;
}

function toProfile(user: User): UserProfile {
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    role: user.role,
    locale: user.locale,
    isPhoneVerified: user.isPhoneVerified,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly auditLog: AuditLogRepository,
  ) {}

  /**
   * Creates an unverified account and sends the OTP. If the phone belongs to
   * an existing UNVERIFIED account, credentials are refreshed and a new OTP
   * is sent (the original registrant may have mistyped or never finished).
   */
  async register(input: RegisterInput): Promise<{ phone: string }> {
    const existing = await this.userRepository.findByPhone(input.phone);
    if (existing?.isPhoneVerified) {
      throw new ConflictException({ code: 'PHONE_TAKEN', message: 'Phone already registered' });
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = existing
      ? await this.userRepository.updateUnverified(existing.id, {
          passwordHash,
          displayName: input.displayName,
        })
      : await this.userRepository.create({
          phone: input.phone,
          passwordHash,
          displayName: input.displayName,
        });

    await this.otpService.issue(user.phone, 'REGISTER');
    await this.auditLog.append({
      actorId: user.id,
      action: 'auth.register',
      entityType: 'User',
      entityId: user.id,
      after: { phone: user.phone, displayName: user.displayName },
    });

    return { phone: user.phone };
  }

  /** Re-sends the registration OTP (rate-limited at the controller). */
  async requestOtp(phone: string): Promise<void> {
    const user = await this.userRepository.findByPhone(phone);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No account for this phone' });
    }
    if (user.isPhoneVerified) {
      throw new ConflictException({ code: 'ALREADY_VERIFIED', message: 'Phone already verified' });
    }
    await this.otpService.issue(phone, 'REGISTER');
  }

  /** Confirms the OTP, marks the phone verified, and signs the user in. */
  async verifyOtp(input: VerifyOtpInput): Promise<AuthResult> {
    const user = await this.userRepository.findByPhone(input.phone);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'No account for this phone' });
    }

    const result = await this.otpService.check(input.phone, 'REGISTER', input.code);
    if (result !== 'valid') {
      const codes: Record<Exclude<typeof result, 'valid'>, { code: string; message: string }> = {
        invalid: { code: 'OTP_INVALID', message: 'Incorrect code' },
        expired: { code: 'OTP_EXPIRED', message: 'Code expired — request a new one' },
        too_many_attempts: {
          code: 'OTP_TOO_MANY_ATTEMPTS',
          message: 'Too many attempts — request a new code',
        },
      };
      throw new UnauthorizedException(codes[result]);
    }

    const verified = user.isPhoneVerified
      ? user
      : await this.userRepository.markPhoneVerified(user.id);
    const tokens = await this.tokenService.issuePair(verified);

    await this.auditLog.append({
      actorId: verified.id,
      action: 'auth.otp_verify',
      entityType: 'User',
      entityId: verified.id,
      before: { isPhoneVerified: user.isPhoneVerified },
      after: { isPhoneVerified: true },
    });

    return { ...tokens, user: toProfile(verified) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userRepository.findByPhone(input.phone);
    // Same error for unknown phone and wrong password — no account enumeration.
    const invalidCredentials = new UnauthorizedException({
      code: 'INVALID_CREDENTIALS',
      message: 'Wrong phone or password',
    });
    if (!user) throw invalidCredentials;

    const passwordOk = await argon2.verify(user.passwordHash, input.password).catch(() => false);
    if (!passwordOk) throw invalidCredentials;

    if (!user.isPhoneVerified) {
      throw new ForbiddenException({
        code: 'PHONE_NOT_VERIFIED',
        message: 'Verify your phone first',
      });
    }

    const tokens = await this.tokenService.issuePair(user);
    await this.auditLog.append({
      actorId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id,
    });

    return { ...tokens, user: toProfile(user) };
  }

  /** Rotates a refresh token; a replayed (already-rotated) token kills all sessions. */
  async refresh(rawToken: string): Promise<TokenPair> {
    const invalid = new UnauthorizedException({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'Sign in again',
    });

    const payload = await this.tokenService.verifyRefreshToken(rawToken);
    if (!payload) throw invalid;

    const stored = await this.refreshTokenRepository.findById(payload.jti);
    if (!stored || stored.tokenHash !== hashToken(rawToken)) throw invalid;

    if (stored.revokedAt) {
      // Reuse of a rotated token — assume theft and revoke everything.
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      await this.auditLog.append({
        actorId: stored.userId,
        action: 'auth.refresh_reuse_detected',
        entityType: 'RefreshToken',
        entityId: stored.id,
      });
      throw invalid;
    }
    if (stored.expiresAt <= new Date()) throw invalid;

    const user = await this.userRepository.findById(stored.userId);
    if (!user) throw invalid;

    await this.refreshTokenRepository.revoke(stored.id);
    const tokens = await this.tokenService.issuePair(user);

    await this.auditLog.append({
      actorId: user.id,
      action: 'auth.refresh',
      entityType: 'RefreshToken',
      entityId: stored.id,
    });

    return tokens;
  }

  /** Revokes the presented refresh token. Idempotent. */
  async logout(rawToken: string): Promise<void> {
    const payload = await this.tokenService.verifyRefreshToken(rawToken);
    if (!payload) return;

    const stored = await this.refreshTokenRepository.findById(payload.jti);
    if (!stored || stored.revokedAt || stored.tokenHash !== hashToken(rawToken)) return;

    await this.refreshTokenRepository.revoke(stored.id);
    await this.auditLog.append({
      actorId: stored.userId,
      action: 'auth.logout',
      entityType: 'RefreshToken',
      entityId: stored.id,
    });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    return toProfile(user);
  }
}
