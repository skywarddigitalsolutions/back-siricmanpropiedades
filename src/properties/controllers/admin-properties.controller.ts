import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdminPropertyList,
  PropertiesService,
} from '../services/properties.service';
import {
  AdminPropertyFiltersDto,
  CreatePropertyDto,
  UpdateDealStatusDto,
  UpdatePropertyDto,
} from '../dto';
import { Auth, GetUser, RoleProtected } from '../../auth/decorators';
import { ValidRoles } from '../../auth/interfaces';
import { User } from '../../users/entities/user.entity';

/**
 * Superficie administrativa de propiedades (`/api/admin/properties`).
 * Guard a nivel de clase: admin o manager. `DELETE /:id` agrega un guard mas
 * estricto a nivel de método (`@RoleProtected(admin)`): `UserRoleGuard`
 * resuelve metadata del handler antes que la de la clase, así que
 * `['admin']` reemplaza a `['admin', 'manager']` para esa ruta.
 */
@ApiTags('Admin Properties')
@Controller('admin/properties')
@Auth(ValidRoles.admin, ValidRoles.manager)
export class AdminPropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  /** POST /api/admin/properties - Crear propiedad (draft) */
  @ApiOperation({ summary: 'Crear una propiedad' })
  @ApiResponse({ status: 201, description: 'Propiedad creada (draft)' })
  @ApiResponse({ status: 400, description: 'Validación o barrio inexistente' })
  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto, @GetUser() actor: User) {
    return this.propertiesService.create(createPropertyDto, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  /** GET /api/admin/properties - List properties, filterable, every publicationStatus */
  @ApiOperation({ summary: 'List properties' })
  @ApiResponse({ status: 200, description: 'Paginated list of properties' })
  @ApiResponse({ status: 400, description: 'Validation' })
  @Get()
  findAll(
    @Query() filters: AdminPropertyFiltersDto,
  ): Promise<AdminPropertyList> {
    return this.propertiesService.findAll(filters);
  }

  /**
   * GET /api/admin/properties/:id - Obtener propiedad por id, incluyendo
   * sus imágenes ordenadas por posición.
   */
  @ApiOperation({ summary: 'Obtener una propiedad por id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad encontrada' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOneWithImages(id);
  }

  /** PATCH /api/admin/properties/:id - Actualizar campos editables */
  @ApiOperation({ summary: 'Actualizar una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad actualizada' })
  @ApiResponse({ status: 400, description: 'Validación' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @GetUser() actor: User,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  /** PATCH /api/admin/properties/:id/publish - draft|archived -> published */
  @ApiOperation({ summary: 'Publicar una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad publicada' })
  @ApiResponse({ status: 400, description: 'Transición inválida' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Patch(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.propertiesService.publish(id, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  /** PATCH /api/admin/properties/:id/archive - draft|published -> archived */
  @ApiOperation({ summary: 'Archivar una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad archivada' })
  @ApiResponse({ status: 400, description: 'Transición inválida' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Patch(':id/archive')
  archive(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.propertiesService.archive(id, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  /** PATCH /api/admin/properties/:id/unpublish - published|archived -> draft */
  @ApiOperation({ summary: 'Despublicar una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad despublicada' })
  @ApiResponse({ status: 400, description: 'Transición inválida' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.propertiesService.unpublish(id, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  /** PATCH /api/admin/properties/:id/deal-status - Set dealStatus (independent of publicationStatus) */
  @ApiOperation({ summary: 'Actualizar el estado comercial de una propiedad' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estado comercial actualizado' })
  @ApiResponse({ status: 400, description: 'Validación o mismo valor actual' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Patch(':id/deal-status')
  updateDealStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDealStatusDto: UpdateDealStatusDto,
    @GetUser() actor: User,
  ) {
    return this.propertiesService.updateDealStatus(
      id,
      updateDealStatusDto.dealStatus,
      { id: actor.id, userName: actor.userName },
    );
  }

  /**
   * DELETE /api/admin/properties/:id - Hard delete, solo admin y solo si la
   * propiedad nunca fue publicada (`firstPublishedAt IS NULL`).
   */
  @ApiOperation({
    summary: 'Eliminar permanentemente una propiedad nunca publicada',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Propiedad eliminada' })
  @ApiResponse({
    status: 400,
    description: 'La propiedad ya fue publicada alguna vez',
  })
  @ApiForbiddenResponse({
    description: 'Autenticado pero sin el rol requerido (admin)',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @RoleProtected(ValidRoles.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() actor: User) {
    return this.propertiesService.remove(id, {
      id: actor.id,
      userName: actor.userName,
    });
  }
}
