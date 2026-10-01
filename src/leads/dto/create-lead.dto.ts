import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadTopic, LeadType } from '../enums/lead.enums';
import { PropertyType } from '../../properties/enums/property.enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Digits plus the usual separators: "+54 9 11 3896-7363", "(011) 4567 8901". */
const PHONE_PATTERN = /^[0-9+()\s-]{6,30}$/;

/** Property data sent with an appraisal request (feature 9 form). */
export class AppraisalDetailsDto {
  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ description: 'Address and neighborhood' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 50 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  rooms?: number;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: 1000000,
    description: 'Approximate m²',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  area?: number;
}

/**
 * Public lead submission (`POST /api/leads`). A visitor must leave a phone or
 * an email (or both); a property inquiry must name the property.
 */
export class CreateLeadDto {
  @ApiProperty({ enum: LeadType })
  @IsEnum(LeadType)
  type: LeadType;

  @ApiPropertyOptional({ description: 'Required for property inquiries' })
  @ValidateIf(
    (dto: CreateLeadDto) =>
      dto.type === LeadType.PROPERTY_INQUIRY || dto.propertyId !== undefined,
  )
  @IsUUID('4')
  propertyId?: string;

  @ApiProperty({ minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Required when there is no email' })
  @ValidateIf(
    (dto: CreateLeadDto) => dto.phone !== undefined || dto.email === undefined,
  )
  @Transform(trim)
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Required when there is no phone' })
  @ValidateIf(
    (dto: CreateLeadDto) => dto.email !== undefined || dto.phone === undefined,
  )
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ enum: LeadTopic, description: 'Contact form topic' })
  @IsOptional()
  @IsEnum(LeadTopic)
  topic?: LeadTopic;

  @ApiPropertyOptional({ type: AppraisalDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AppraisalDetailsDto)
  details?: AppraisalDetailsDto;

  /**
   * Honeypot: hidden from people, filled in by bots. A non-empty value makes
   * the service accept the request without saving anything.
   */
  @ApiPropertyOptional({ description: 'Leave empty (anti-spam)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
