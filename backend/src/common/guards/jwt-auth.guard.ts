import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Wraps the standard Passport JWT guard with a single dev-only escape hatch:
 * when config.jwt.bypass is true, every request is treated as an
 * authenticated admin and no token is required at all. This is gated hard in
 * env.validation.ts so it can never be true when NODE_ENV=production —
 * this guard trusts that invariant and does not re-check it, keeping the
 * request-path logic simple.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly bypass: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    this.bypass = this.configService.get<boolean>('jwt.bypass') ?? false;
    if (this.bypass) {
      this.logger.warn(
        'JWT_BYPASS is enabled — ALL requests are being treated as an authenticated admin. ' +
          'This must never be enabled outside local development.',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    if (this.bypass) {
      const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
      request.user = {
        userId: 'bypass-user',
        email: 'bypass@local.dev',
        roles: ['admin', 'hr', 'employee'],
      };
      return true;
    }
    return super.canActivate(context) as boolean | Promise<boolean>;
  }
}
