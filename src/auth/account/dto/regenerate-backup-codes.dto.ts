import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegenerateBackupCodesDto {
  @ApiProperty({ example: '123456', description: 'Código TOTP vigente' })
  @IsString()
  @Length(6, 6)
  code: string;
}
