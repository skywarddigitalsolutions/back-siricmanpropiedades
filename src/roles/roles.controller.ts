import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Auth } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';

/**
 * Gestión de roles - solo admin
 */
@ApiTags('Roles')
@Controller('roles')
@Auth(ValidRoles.admin)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** GET /api/roles - Todos los roles */
  @ApiOperation({ summary: 'Listar todos los roles' })
  @ApiResponse({ status: 200, description: 'Listado de roles' })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  /** GET /api/roles/available - Roles asignables (sin admin) */
  @ApiOperation({
    summary: 'Roles asignables',
    description:
      'Excluye "admin" - ese rol solo se asigna por seed o directamente en la DB.',
  })
  @ApiResponse({ status: 200, description: 'Roles asignables' })
  @Get('available')
  findAvailable() {
    return this.rolesService.findAvailable();
  }

  /** GET /api/roles/:id - Obtener rol por ID */
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'No existe un rol con ese ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }
}
