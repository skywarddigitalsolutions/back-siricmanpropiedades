import {
  BadRequestException,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PropertyImagesService } from '../images/property-images.service';
import { Auth, GetUser } from '../../auth/decorators';
import { ValidRoles } from '../../auth/interfaces';
import { User } from '../../users/entities/user.entity';
import { PropertyImageResponse } from '../helpers/property-image.mapper';

/**
 * multer limits for the upload route. `fileSize` is the HTTP 413 boundary
 * (design.md's Upload transport decision); `files`/`fields` reject any
 * request shape other than exactly one file part with no extra fields.
 *
 * `parts: 2`, not `1` (deviation from design.md's literal value, verified
 * empirically against this project's installed `busboy`/multer versions):
 * busboy's internal `parts` counter increments once per multipart boundary
 * *occurrence* in the stream, and a single-file request always contains
 * two boundary occurrences (the one opening the file part and the closing
 * `--boundary--`), not one. With `parts: 1`, busboy fires `LIMIT_PART_COUNT`
 * ("Too many parts") on every legitimate single-file upload before any
 * file data is even read — reproduced against a minimal Express+multer
 * server with this exact config, isolated from the rest of this app.
 * `parts: 2` is the smallest value that lets exactly one file through
 * while a second field/file still triggers `fields`/`files`
 * (`LIMIT_FIELD_COUNT`/`LIMIT_FILE_COUNT`) first — verified the same way.
 */
export const IMAGE_UPLOAD_LIMITS = {
  fileSize: 15 * 1024 * 1024,
  files: 1,
  fields: 0,
  parts: 2,
};

/**
 * Admin image endpoints (`/api/admin/properties/:id/images`). Class-level
 * guard mirrors `AdminPropertiesController`: admin or manager, no per-method
 * override. Reorder and delete are added in Phase 5.
 */
@ApiTags('Admin Property Images')
@Controller('admin/properties/:id/images')
@Auth(ValidRoles.admin, ValidRoles.manager)
export class AdminPropertyImagesController {
  constructor(private readonly propertyImagesService: PropertyImagesService) {}

  /** POST /api/admin/properties/:id/images - Subir una imagen */
  @ApiOperation({ summary: 'Subir una imagen a una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen subida' })
  @ApiResponse({
    status: 400,
    description:
      'Archivo inválido, no es una imagen soportada, o cupo excedido',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 15 MB' })
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: IMAGE_UPLOAD_LIMITS,
    }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser() actor: User,
  ): Promise<PropertyImageResponse> {
    if (!file) throw new BadRequestException('file is required');

    return this.propertyImagesService.upload(id, file, {
      id: actor.id,
      userName: actor.userName,
    });
  }
}
