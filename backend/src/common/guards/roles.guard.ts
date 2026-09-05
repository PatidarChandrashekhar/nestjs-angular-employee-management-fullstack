import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * When RBAC_ENABLED=false, this guard is a no-op (useful for local
 * development so you don't have to seed/juggle multiple role accounts).
 * In every other case it enforces the roles declared via @Roles(...).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly rbacEnabled: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.rbacEnabled = this.configService.get<boolean>('rbac.enabled') ?? true;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.rbacEnabled) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request.');
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(', ')}.`,
      );
    }
    return true;
  }
}
