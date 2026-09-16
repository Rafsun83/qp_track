import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
import { OrganizationMemberService } from '../../organization_members/service/organization_member.service.js';
import { ROLES_KEY } from '../decorator/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly organizationMemberService: OrganizationMemberService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrganizationRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // Role lives on the org membership, not the JWT, so it must be
    // resolved per-request against the org the route is acting on.
    const organizationId = request.params?.id;
    const userId = request.user?.sub;

    const membership = await this.organizationMemberService.findMembership(
      organizationId,
      userId,
    );
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    request.organizationMember = membership;
    return requiredRoles.includes(membership.role);
  }
}
