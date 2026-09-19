import { IsNotEmpty, IsString } from 'class-validator';
import { ProjectRole } from '../enum/project-role.enum.js';

export class ProjectMemberAddDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  role: ProjectRole;
}
