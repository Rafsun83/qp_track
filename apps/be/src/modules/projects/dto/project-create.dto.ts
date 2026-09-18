import { IsString } from 'class-validator';

export class craeteProjectDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  key: string;
}
