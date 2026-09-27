import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DisableMfaDto {
  @ApiProperty({
    example: 'Password1!',
    description: 'Contraseña actual de la cuenta',
  })
  @IsString()
  password: string;

  @ApiProperty({
    example: '123456',
    description:
      '6 dígitos para un código TOTP, hasta 10 caracteres para un código de respaldo',
  })
  @IsString()
  @Length(6, 10)
  code: string;
}
