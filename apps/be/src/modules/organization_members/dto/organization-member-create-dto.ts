import { IsNotEmpty, IsString } from 'class-validator';
import { OrganizationRole } from '../enum/organization-role.enum.js';

export class OrganizationMemberCreateDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  role: OrganizationRole;

  // @IsString()
  // @IsNotEmpty()
  // organizationId: string;
}
