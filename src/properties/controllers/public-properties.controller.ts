import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PUBLIC_READ_THROTTLE } from '../../common/constants/public-read-throttle.constants';
import { PublicPropertiesService } from '../services/public-properties.service';
import { PublicPropertyFiltersDto } from '../dto';

/**
 * Unauthenticated public catalog (`/api/properties`). No `@Auth`/guard
 * decorator anywhere in this controller — every route is public, matching
 * `NeighborhoodsController`'s `GET /` precedent.
 */
@ApiTags('Public Properties')
@Throttle(PUBLIC_READ_THROTTLE)
@Controller('properties')
export class PublicPropertiesController {
  constructor(
    private readonly publicPropertiesService: PublicPropertiesService,
  ) {}

  /** GET /api/properties - Listado público filtrable de propiedades publicadas */
  @ApiOperation({ summary: 'Listar propiedades publicadas (público)' })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de propiedades publicadas',
  })
  @ApiResponse({ status: 400, description: 'Validación' })
  @Get()
  findAll(@Query() filters: PublicPropertyFiltersDto) {
    return this.publicPropertiesService.findAll(filters);
  }

  /** GET /api/properties/:slug - Detalle público de una propiedad publicada */
  @ApiOperation({
    summary: 'Obtener una propiedad publicada por slug (público)',
  })
  @ApiParam({ name: 'slug' })
  @ApiResponse({ status: 200, description: 'Propiedad encontrada' })
  @ApiResponse({
    status: 404,
    description: 'No existe o no está publicada',
  })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.publicPropertiesService.findBySlug(slug);
  }
}
