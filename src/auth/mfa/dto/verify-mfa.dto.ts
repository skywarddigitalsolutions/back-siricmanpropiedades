import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({
    description:
      'El "mfaToken" devuelto por POST /auth/login cuando mfaRequired=true',
  })
  @IsString()
  mfaToken: string;

  @ApiProperty({
    example: '123456',
    description:
      '6 dígitos para un código TOTP, hasta 10 caracteres para un código de respaldo',
  })
  @IsString()
  @Length(6, 10)
  code: string;
}
