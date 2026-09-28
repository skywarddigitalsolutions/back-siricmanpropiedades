import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DealStatus } from '../enums/property.enums';

export class UpdateDealStatusDto {
  @ApiProperty({ enum: DealStatus })
  @IsEnum(DealStatus)
  dealStatus: DealStatus;
}
