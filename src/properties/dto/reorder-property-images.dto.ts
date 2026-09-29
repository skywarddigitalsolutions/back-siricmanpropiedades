import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for `PUT /api/admin/properties/:id/images/order`. `imageIds` must be
 * an exact permutation of the property's current image ids (checked by
 * `PropertyImagesRepository.reorder`); this DTO only validates shape.
 */
export class ReorderPropertyImagesDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  imageIds: string[];
}
