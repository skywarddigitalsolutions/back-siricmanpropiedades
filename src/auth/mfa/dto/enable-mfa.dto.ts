import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  /**
   * Se exige la contraseña (y no solo el token) para que un token de
   * sesión robado no alcance para inscribir un secreto MFA ajeno y
   * bloquear al dueño real de la cuenta.
   */
  @ApiProperty({
    example: 'Password1!',
    description: 'Contraseña actual de la cuenta',
  })
  @IsString()
  password: string;
}
