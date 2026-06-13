/**
 * Plutu payment gateway abstraction (KARHABTI_BUILD_PROMPT.md §2/§10: payments
 * behind an interface; exact REST endpoints are an external input). The real
 * HTTP driver plugs in here without touching any business logic — selection is
 * env-driven in plutu.module.ts.
 */
export const PLUTU_GATEWAY = Symbol('PLUTU_GATEWAY');

/** Mobile-wallet methods that use Plutu's OTP flow. */
export type WalletMethod = 'SADAD' | 'ADFALI';

/** Stable gateway error codes — services map these to client-facing codes. */
export type PlutuErrorCode = 'OTP_INVALID' | 'DECLINED' | 'GATEWAY_ERROR';

export class PlutuError extends Error {
  constructor(
    readonly code: PlutuErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PlutuError';
  }
}

export interface InitWalletParams {
  method: WalletMethod;
  amountLYD: string; // decimal string, e.g. "25.00"
  mobileNumber: string; // payer's wallet number — Plutu sends the OTP here
  reference: string; // our payment id (idempotency / callback correlation)
}

export interface InitWalletResult {
  /** Plutu process reference to confirm the OTP against. */
  processId: string;
  raw: unknown;
}

export interface ConfirmWalletParams {
  method: WalletMethod;
  processId: string;
  code: string; // the OTP the payer received
  amountLYD: string;
  mobileNumber: string;
}

export interface ConfirmWalletResult {
  /** Final Plutu transaction reference (used for refunds). */
  transactionRef: string;
  raw: unknown;
}

export interface RefundParams {
  transactionRef: string;
  amountLYD: string;
}

export interface RefundResult {
  refundRef: string;
  raw: unknown;
}

export interface PlutuGateway {
  /** Step 1 of the wallet flow — triggers the OTP. Throws PlutuError on failure. */
  initWallet(params: InitWalletParams): Promise<InitWalletResult>;
  /** Step 2 — completes the charge with the OTP. Throws PlutuError('OTP_INVALID') on a bad code. */
  confirmWallet(params: ConfirmWalletParams): Promise<ConfirmWalletResult>;
  /** Reverses a settled charge (admin-initiated). */
  refund(params: RefundParams): Promise<RefundResult>;
  /** Verifies the HMAC signature on a raw callback body before it is trusted. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
