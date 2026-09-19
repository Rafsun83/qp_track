import { IsNotEmpty, IsString } from 'class-validator';

export class craeteProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  key: string;
}
