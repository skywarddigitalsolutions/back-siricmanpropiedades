import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MESSAGE,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
} from '../../common/constants/password.constants';

export class LoginUserDto {
  @ApiProperty({ example: 'admin' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsString()
  @MinLength(2)
  userName: string;

  @ApiProperty({ example: 'Admin1234!' })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password: string;
}
