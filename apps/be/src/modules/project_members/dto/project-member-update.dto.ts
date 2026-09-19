import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProjectRole } from '../enum/project-role.enum.js';

export class ProjectMemberUpdateDto {
  @IsEnum(ProjectRole)
  @IsNotEmpty()
  role: ProjectRole;
}
