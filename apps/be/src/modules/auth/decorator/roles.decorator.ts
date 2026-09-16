import { SetMetadata } from '@nestjs/common';
import { OrganizationRole } from '../../organization_members/enum/organization-role.enum.js';
// import { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: OrganizationRole[]) =>
  SetMetadata(ROLES_KEY, roles);
