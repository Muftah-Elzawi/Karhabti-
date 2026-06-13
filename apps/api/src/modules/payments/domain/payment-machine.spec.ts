import { PAYMENT_STATUS_TIMESTAMP, canTransition, isTerminal } from './payment-machine';

describe('payment-machine', () => {
  it('allows the happy-path wallet transitions', () => {
    expect(canTransition('INITIATED', 'PENDING')).toBe(true);
    expect(canTransition('PENDING', 'SUCCESS')).toBe(true);
    expect(canTransition('SUCCESS', 'REFUNDED')).toBe(true);
  });

  it('allows failure transitions before settlement', () => {
    expect(canTransition('INITIATED', 'FAILED')).toBe(true);
    expect(canTransition('PENDING', 'FAILED')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('SUCCESS', 'FAILED')).toBe(false);
    expect(canTransition('SUCCESS', 'PENDING')).toBe(false);
    expect(canTransition('PENDING', 'REFUNDED')).toBe(false);
    expect(canTransition('INITIATED', 'SUCCESS')).toBe(false);
  });

  it('treats FAILED and REFUNDED as terminal (no outgoing transitions)', () => {
    expect(isTerminal('FAILED')).toBe(true);
    expect(isTerminal('REFUNDED')).toBe(true);
    expect(canTransition('FAILED', 'PENDING')).toBe(false);
    expect(canTransition('REFUNDED', 'SUCCESS')).toBe(false);
  });

  it('does not treat SUCCESS as terminal (refunds are still possible)', () => {
    expect(isTerminal('SUCCESS')).toBe(false);
  });

  it('maps settlement states to their timestamp columns', () => {
    expect(PAYMENT_STATUS_TIMESTAMP.SUCCESS).toBe('paidAt');
    expect(PAYMENT_STATUS_TIMESTAMP.FAILED).toBe('failedAt');
    expect(PAYMENT_STATUS_TIMESTAMP.REFUNDED).toBe('refundedAt');
    expect(PAYMENT_STATUS_TIMESTAMP.PENDING).toBeUndefined();
  });
});
