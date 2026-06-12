import {
  canAdminAssign,
  canAdminOverride,
  canCustomerCancel,
  canProviderAct,
} from './booking-machine';

describe('booking state machine', () => {
  describe('customer cancel', () => {
    it.each([
      ['PENDING', true],
      ['CONFIRMED', true],
      ['IN_PROGRESS', false],
      ['COMPLETED', false],
      ['CANCELLED', false],
    ] as const)('from %s → %s', (status, allowed) => {
      expect(canCustomerCancel({ status, providerId: null })).toBe(allowed);
    });
  });

  describe('admin assign', () => {
    it('only while PENDING', () => {
      expect(canAdminAssign({ status: 'PENDING', providerId: null })).toBe(true);
      expect(canAdminAssign({ status: 'CONFIRMED', providerId: 'p1' })).toBe(false);
      expect(canAdminAssign({ status: 'CANCELLED', providerId: null })).toBe(false);
    });
  });

  describe('provider actions', () => {
    it('require an assignment', () => {
      expect(canProviderAct({ status: 'PENDING', providerId: null }, 'accept')).toBe(false);
      expect(canProviderAct({ status: 'PENDING', providerId: 'p1' }, 'accept')).toBe(true);
    });

    it.each([
      ['accept', 'PENDING', true],
      ['accept', 'CONFIRMED', false],
      ['decline', 'PENDING', true],
      ['decline', 'IN_PROGRESS', false],
      ['start', 'CONFIRMED', true],
      ['start', 'PENDING', false],
      ['complete', 'IN_PROGRESS', true],
      ['complete', 'CONFIRMED', false],
    ] as const)('%s from %s → %s', (action, status, allowed) => {
      expect(canProviderAct({ status, providerId: 'p1' }, action)).toBe(allowed);
    });
  });

  describe('admin override', () => {
    it('terminal states are immutable', () => {
      expect(canAdminOverride('COMPLETED', 'CANCELLED')).toBe(false);
      expect(canAdminOverride('CANCELLED', 'PENDING')).toBe(false);
    });

    it('no-op transitions are rejected', () => {
      expect(canAdminOverride('PENDING', 'PENDING')).toBe(false);
    });

    it('non-terminal states can be moved', () => {
      expect(canAdminOverride('PENDING', 'CANCELLED')).toBe(true);
      expect(canAdminOverride('CONFIRMED', 'IN_PROGRESS')).toBe(true);
      expect(canAdminOverride('IN_PROGRESS', 'COMPLETED')).toBe(true);
    });
  });
});
