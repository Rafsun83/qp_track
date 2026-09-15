import { IsNotEmpty, IsString } from 'class-validator';

export class OrganizationMemberCreateDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
