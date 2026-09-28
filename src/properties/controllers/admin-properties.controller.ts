import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from '../services/properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from '../dto';
import { Auth, GetUser } from '../../auth/decorators';
import { ValidRoles } from '../../auth/interfaces';
import { User } from '../../users/entities/user.entity';

/**
 * Superficie administrativa de propiedades (`/api/admin/properties`).
 * Guard a nivel de clase: admin o manager. `DELETE /:id` (fase 4) agrega un
 * guard mas estricto a nivel de método (`@RoleProtected(admin)`).
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

  /** GET /api/admin/properties/:id - Obtener propiedad por id */
  @ApiOperation({ summary: 'Obtener una propiedad por id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Propiedad encontrada' })
  @ApiResponse({
    status: 404,
    description: 'No existe una propiedad con ese id',
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOne(id);
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
}
