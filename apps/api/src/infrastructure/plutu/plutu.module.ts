import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env';
import { PLUTU_GATEWAY } from './plutu-gateway';
import { SandboxPlutuGateway } from './sandbox-plutu.gateway';

/**
 * Plutu gateway selection. Only the sandbox driver exists today; the real HTTP
 * driver is added when a merchant account is approved and selected here via
 * PLUTU_MODE=live — consumers (the payments module) never change.
 */
@Global()
@Module({
  providers: [
    SandboxPlutuGateway,
    {
      provide: PLUTU_GATEWAY,
      inject: [ConfigService, SandboxPlutuGateway],
      useFactory: (config: ConfigService<Env, true>, sandbox: SandboxPlutuGateway) => {
        const mode = config.get('PLUTU_MODE', { infer: true });
        if (mode === 'live') {
          // The live HTTP driver is not implemented yet — fail fast rather than
          // silently charging through the sandbox in production.
          throw new Error('PLUTU_MODE=live is not supported yet (no live driver wired)');
        }
        return sandbox;
      },
    },
  ],
  exports: [PLUTU_GATEWAY],
})
export class PlutuModule {}
