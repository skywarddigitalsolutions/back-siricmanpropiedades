import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMfaDto {
  @ApiProperty({
    example: '123456',
    description: 'Código de 6 dígitos generado por la app autenticadora',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}
