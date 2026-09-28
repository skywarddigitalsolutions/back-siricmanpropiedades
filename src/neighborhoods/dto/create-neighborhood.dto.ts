import { IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNeighborhoodDto {
  @ApiProperty({
    example: 'Villa Devoto Norte',
    description: 'Trimmed and collapsed to single spaces before validation',
  })
  @Transform(({ value }: { value: string }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @Length(2, 100)
  name: string;
}
