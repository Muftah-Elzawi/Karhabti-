import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';

import type { Env } from '../../../config/env';
import type { AccessTokenPayload, RefreshTokenPayload } from '../domain/token-payload';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** SHA-256 of the raw token — what we persist instead of the token itself. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Env, true>,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  /** Issues an access+refresh pair and persists the refresh token (hashed). */
  async issuePair(user: User): Promise<TokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
    });

    const refreshTtlDays = this.configService.get('JWT_REFRESH_TTL_DAYS', { infer: true });
    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: user.id, jti };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: `${refreshTtlDays}d`,
    });

    await this.refreshTokenRepository.create({
      id: jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }

  /** Verifies a refresh JWT signature and returns its payload, or null. */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      return null;
    }
  }
}
