import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../../common/constants/password.constants';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual de la cuenta' })
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @ApiProperty({
    description:
      'Mínimo 6 caracteres, con mayúscula, minúscula y (número o símbolo)',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword: string;

  @ApiPropertyOptional({
    description:
      'Código TOTP o de respaldo; obligatorio si la cuenta tiene MFA',
  })
  @IsOptional()
  @IsString()
  @Length(6, 10)
  code?: string;
}
