import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { RefreshToken, User } from '@prisma/client';
import * as argon2 from 'argon2';

import type { AuditLogRepository } from '../../../infrastructure/audit/audit-log.repository';
import type { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import type { UserRepository } from '../infrastructure/user.repository';
import { AuthService } from './auth.service';
import type { OtpService } from './otp.service';
import { hashToken, TokenService } from './token.service';

const baseUser: User = {
  id: 'user-1',
  phone: '0912345678',
  email: null,
  passwordHash: '',
  displayName: 'أحمد',
  role: 'CUSTOMER',
  locale: 'ar',
  isPhoneVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  const createMocks = () => {
    const userRepository = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateUnverified: jest.fn(),
      markPhoneVerified: jest.fn(),
    };
    const refreshTokenRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const tokenService = {
      issuePair: jest.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' }),
      verifyRefreshToken: jest.fn(),
    };
    const otpService = { issue: jest.fn(), check: jest.fn() };
    const auditLog = { append: jest.fn() };

    const service = new AuthService(
      userRepository as unknown as UserRepository,
      refreshTokenRepository as unknown as RefreshTokenRepository,
      tokenService as unknown as TokenService,
      otpService as unknown as OtpService,
      auditLog as unknown as AuditLogRepository,
    );
    return { userRepository, refreshTokenRepository, tokenService, otpService, auditLog, service };
  };

  describe('register', () => {
    it('creates an unverified user, hashes the password, sends OTP, audits', async () => {
      const m = createMocks();
      m.userRepository.findByPhone.mockResolvedValue(null);
      m.userRepository.create.mockImplementation((data: { passwordHash: string }) =>
        Promise.resolve({ ...baseUser, ...data, isPhoneVerified: false }),
      );

      await m.service.register({
        phone: '0912345678',
        password: 'secret-password',
        displayName: 'أحمد',
      });

      const created = m.userRepository.create.mock.calls[0][0];
      expect(created.passwordHash).not.toContain('secret-password');
      await expect(argon2.verify(created.passwordHash, 'secret-password')).resolves.toBe(true);
      expect(m.otpService.issue).toHaveBeenCalledWith('0912345678', 'REGISTER');
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.register' }),
      );
    });

    it('rejects an already-verified phone with PHONE_TAKEN', async () => {
      const m = createMocks();
      m.userRepository.findByPhone.mockResolvedValue(baseUser);

      await expect(
        m.service.register({ phone: baseUser.phone, password: 'whatever-123', displayName: 'X' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(m.userRepository.create).not.toHaveBeenCalled();
    });

    it('refreshes credentials and re-sends OTP for an unverified existing phone', async () => {
      const m = createMocks();
      const unverified = { ...baseUser, isPhoneVerified: false };
      m.userRepository.findByPhone.mockResolvedValue(unverified);
      m.userRepository.updateUnverified.mockResolvedValue(unverified);

      await m.service.register({
        phone: unverified.phone,
        password: 'new-password-1',
        displayName: 'أحمد',
      });

      expect(m.userRepository.updateUnverified).toHaveBeenCalled();
      expect(m.userRepository.create).not.toHaveBeenCalled();
      expect(m.otpService.issue).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('marks the phone verified and returns tokens + profile', async () => {
      const m = createMocks();
      const unverified = { ...baseUser, isPhoneVerified: false };
      m.userRepository.findByPhone.mockResolvedValue(unverified);
      m.otpService.check.mockResolvedValue('valid');
      m.userRepository.markPhoneVerified.mockResolvedValue(baseUser);

      const result = await m.service.verifyOtp({ phone: baseUser.phone, code: '123456' });

      expect(m.userRepository.markPhoneVerified).toHaveBeenCalledWith(baseUser.id);
      expect(result.accessToken).toBe('at');
      expect(result.user.isPhoneVerified).toBe(true);
    });

    it.each(['invalid', 'expired', 'too_many_attempts'] as const)(
      'rejects with 401 when the code is %s',
      async (state) => {
        const m = createMocks();
        m.userRepository.findByPhone.mockResolvedValue({ ...baseUser, isPhoneVerified: false });
        m.otpService.check.mockResolvedValue(state);

        await expect(
          m.service.verifyOtp({ phone: baseUser.phone, code: '000000' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      },
    );
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const m = createMocks();
      const passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
      m.userRepository.findByPhone.mockResolvedValue({ ...baseUser, passwordHash });

      const result = await m.service.login({ phone: baseUser.phone, password: 'correct-password' });
      expect(result.refreshToken).toBe('rt');
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login' }),
      );
    });

    it('uses the same error for unknown phone and wrong password', async () => {
      const m = createMocks();
      m.userRepository.findByPhone.mockResolvedValue(null);
      const unknownPhone = m.service
        .login({ phone: '0911111111', password: 'x' })
        .catch((e: UnauthorizedException) => e.getResponse());

      const passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
      m.userRepository.findByPhone.mockResolvedValue({ ...baseUser, passwordHash });
      const wrongPassword = m.service
        .login({ phone: baseUser.phone, password: 'wrong' })
        .catch((e: UnauthorizedException) => e.getResponse());

      expect(await unknownPhone).toEqual(await wrongPassword);
    });

    it('blocks unverified phones with PHONE_NOT_VERIFIED', async () => {
      const m = createMocks();
      const passwordHash = await argon2.hash('correct-password', { type: argon2.argon2id });
      m.userRepository.findByPhone.mockResolvedValue({
        ...baseUser,
        passwordHash,
        isPhoneVerified: false,
      });

      await expect(
        m.service.login({ phone: baseUser.phone, password: 'correct-password' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refresh', () => {
    const storedToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
      id: 'jti-1',
      userId: baseUser.id,
      tokenHash: hashToken('raw-refresh'),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
      createdAt: new Date(),
      ...overrides,
    });

    it('rotates: revokes the old token and issues a new pair', async () => {
      const m = createMocks();
      m.tokenService.verifyRefreshToken.mockResolvedValue({ sub: baseUser.id, jti: 'jti-1' });
      m.refreshTokenRepository.findById.mockResolvedValue(storedToken());
      m.userRepository.findById.mockResolvedValue(baseUser);

      const result = await m.service.refresh('raw-refresh');

      expect(m.refreshTokenRepository.revoke).toHaveBeenCalledWith('jti-1');
      expect(result.accessToken).toBe('at');
    });

    it('reuse of a rotated token revokes ALL the user sessions', async () => {
      const m = createMocks();
      m.tokenService.verifyRefreshToken.mockResolvedValue({ sub: baseUser.id, jti: 'jti-1' });
      m.refreshTokenRepository.findById.mockResolvedValue(storedToken({ revokedAt: new Date() }));

      await expect(m.service.refresh('raw-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(m.refreshTokenRepository.revokeAllForUser).toHaveBeenCalledWith(baseUser.id);
    });

    it('rejects an expired or unknown token', async () => {
      const m = createMocks();
      m.tokenService.verifyRefreshToken.mockResolvedValue({ sub: baseUser.id, jti: 'jti-1' });
      m.refreshTokenRepository.findById.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(m.service.refresh('raw-refresh')).rejects.toBeInstanceOf(UnauthorizedException);

      m.refreshTokenRepository.findById.mockResolvedValue(null);
      await expect(m.service.refresh('raw-refresh')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the presented token and audits', async () => {
      const m = createMocks();
      m.tokenService.verifyRefreshToken.mockResolvedValue({ sub: baseUser.id, jti: 'jti-1' });
      m.refreshTokenRepository.findById.mockResolvedValue({
        id: 'jti-1',
        userId: baseUser.id,
        tokenHash: hashToken('raw-refresh'),
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      await m.service.logout('raw-refresh');

      expect(m.refreshTokenRepository.revoke).toHaveBeenCalledWith('jti-1');
      expect(m.auditLog.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.logout' }),
      );
    });

    it('is idempotent for invalid tokens', async () => {
      const m = createMocks();
      m.tokenService.verifyRefreshToken.mockResolvedValue(null);
      await expect(m.service.logout('garbage')).resolves.toBeUndefined();
      expect(m.refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
