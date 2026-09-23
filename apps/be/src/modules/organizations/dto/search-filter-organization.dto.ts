import { IsOptional, IsString } from 'class-validator';

export class SearchFilterOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;
}
