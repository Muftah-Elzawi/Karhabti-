import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';

import { RolesGuard } from './roles.guard';

function contextFor(role: UserRole | undefined): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const requireRoles = (roles: UserRole[] | undefined) =>
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(roles);

  it('allows when no roles are required', () => {
    requireRoles(undefined);
    expect(guard.canActivate(contextFor('CUSTOMER'))).toBe(true);
  });

  it('allows a matching role', () => {
    requireRoles(['ADMIN']);
    expect(guard.canActivate(contextFor('ADMIN'))).toBe(true);
  });

  it('denies a non-matching role', () => {
    requireRoles(['ADMIN']);
    expect(() => guard.canActivate(contextFor('CUSTOMER'))).toThrow(ForbiddenException);
  });

  it('denies when no user is attached (guard misordering)', () => {
    requireRoles(['ADMIN']);
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
