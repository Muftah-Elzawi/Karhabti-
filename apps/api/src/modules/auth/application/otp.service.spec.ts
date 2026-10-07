import type { OtpCode } from '@prisma/client';

import type { SmsSender } from '../../../infrastructure/sms/sms-sender';
import { OTP_MAX_ATTEMPTS } from '../domain/auth.constants';
import type { OtpRepository } from '../infrastructure/otp.repository';
import { hashOtp, OtpService } from './otp.service';

describe('OtpService', () => {
  const createMocks = () => {
    const otpRepository = {
      create: jest.fn(),
      findActive: jest.fn(),
      incrementAttempts: jest.fn(),
      consume: jest.fn(),
      invalidateActive: jest.fn(),
    };
    const smsSender: SmsSender = { send: jest.fn() };
    const service = new OtpService(otpRepository as unknown as OtpRepository, smsSender);
    return { otpRepository, smsSender, service };
  };

  it('issue() invalidates previous codes, stores a hash, and sends an SMS with the code', async () => {
    const { otpRepository, smsSender, service } = createMocks();

    await service.issue('0912345678', 'REGISTER');

    expect(otpRepository.invalidateActive).toHaveBeenCalledWith('0912345678', 'REGISTER');
    const stored = otpRepository.create.mock.calls[0][0];
    expect(stored.codeHash).toMatch(/^[a-f0-9]{64}$/); // hashed, never plain
    const sentMessage = (smsSender.send as jest.Mock).mock.calls[0][1] as string;
    const sentCode = /\d{6}/.exec(sentMessage)?.[0];
    expect(sentCode).toBeDefined();
    expect(hashOtp(sentCode as string)).toBe(stored.codeHash);
  });

  it('check() consumes a correct code', async () => {
    const { otpRepository, service } = createMocks();
    otpRepository.findActive.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtp('123456'),
      attempts: 0,
    } as OtpCode);

    await expect(service.check('0912345678', 'REGISTER', '123456')).resolves.toBe('valid');
    expect(otpRepository.consume).toHaveBeenCalledWith('otp-1');
  });

  it('check() counts wrong attempts and locks after the limit', async () => {
    const { otpRepository, service } = createMocks();
    otpRepository.findActive.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtp('123456'),
      attempts: 0,
    } as OtpCode);
    otpRepository.incrementAttempts.mockResolvedValue({ attempts: 1 } as OtpCode);

    await expect(service.check('0912345678', 'REGISTER', '000000')).resolves.toBe('invalid');

    otpRepository.incrementAttempts.mockResolvedValue({ attempts: OTP_MAX_ATTEMPTS } as OtpCode);
    await expect(service.check('0912345678', 'REGISTER', '000000')).resolves.toBe(
      'too_many_attempts',
    );
  });

  it('check() reports expired when no active code exists', async () => {
    const { otpRepository, service } = createMocks();
    otpRepository.findActive.mockResolvedValue(null);
    await expect(service.check('0912345678', 'REGISTER', '123456')).resolves.toBe('expired');
  });

  it('check() refuses codes that already hit the attempt limit', async () => {
    const { otpRepository, service } = createMocks();
    otpRepository.findActive.mockResolvedValue({
      id: 'otp-1',
      codeHash: hashOtp('123456'),
      attempts: OTP_MAX_ATTEMPTS,
    } as OtpCode);

    await expect(service.check('0912345678', 'REGISTER', '123456')).resolves.toBe(
      'too_many_attempts',
    );
    expect(otpRepository.consume).not.toHaveBeenCalled();
  });
});
