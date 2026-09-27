import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsUUID,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../common/constants/password.constants';

export class CreateUserDto {
  @ApiProperty({ example: 'jperez', description: 'Se normaliza a minúsculas' })
  @Transform(({ value }: { value: string }) => value.toLowerCase().trim())
  @IsString()
  @IsNotEmpty({ message: 'Username cannot be empty' })
  userName: string;

  @ApiProperty({
    example: 'Password1!',
    description:
      'Mínimo 6 caracteres, con mayúscula, minúscula y (número o símbolo)',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'ID de un rol existente (ver GET /api/roles)',
  })
  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsNotEmpty({ message: 'Role is required' })
  roleId: string;
}
