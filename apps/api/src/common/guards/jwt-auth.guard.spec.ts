import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { Env } from '../../config/env';
import { JwtAuthGuard, RequestWithUser } from './jwt-auth.guard';

const SECRET = 'test-access-secret-of-32-characters!';

function contextFor(request: Partial<RequestWithUser>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwtService = new JwtService({});
  const configService = {
    get: jest.fn().mockReturnValue(SECRET),
  } as unknown as ConfigService<Env, true>;
  const guard = new JwtAuthGuard(jwtService, configService);

  it('accepts a valid Bearer token and attaches req.user', async () => {
    const token = await jwtService.signAsync(
      { sub: 'user-1', phone: '0912345678', role: 'CUSTOMER' },
      { secret: SECRET, expiresIn: '5m' },
    );
    const request = { headers: { authorization: `Bearer ${token}` } } as RequestWithUser;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', phone: '0912345678', role: 'CUSTOMER' });
  });

  it('rejects a missing token', async () => {
    await expect(
      guard.canActivate(contextFor({ headers: {} } as RequestWithUser)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = await jwtService.signAsync(
      { sub: 'user-1', phone: '0912345678', role: 'ADMIN' },
      { secret: 'wrong-secret-that-is-32-characters!!', expiresIn: '5m' },
    );
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: `Bearer ${forged}` } } as RequestWithUser),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
