import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './services/users.service';
import { CreateUserDto, ResetPasswordDto } from './dto';
import { Auth, GetUser } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';
import { User } from './entities/user.entity';

/**
 * Gestión de usuarios - todos los endpoints requieren rol ADMIN
 */
@ApiTags('Users')
@Controller('users')
@Auth(ValidRoles.admin)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /api/users - Crear usuario con rol */
  @ApiOperation({ summary: 'Crear usuario con rol asignado' })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({
    status: 400,
    description: 'userName duplicado o roleId inválido',
  })
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @GetUser() admin: User) {
    const user = await this.usersService.create(createUserDto, {
      id: admin.id,
      userName: admin.userName,
    });
    return this.toResponse(user);
  }

  /** GET /api/users?isActive=true&limit=10&offset=0 - Listar usuarios */
  @ApiOperation({ summary: 'Listar usuarios' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Listado paginado de usuarios' })
  @Get()
  findAll(
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.usersService.findAll({ isActive, limit, offset });
  }

  /** GET /api/users/:id - Obtener usuario por ID */
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'No existe un usuario con ese ID' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  /** PATCH /api/users/:id/activate - Activar usuario */
  @ApiOperation({ summary: 'Activar usuario' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario activado' })
  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @GetUser() admin: User) {
    return this.usersService.activate(id, {
      id: admin.id,
      userName: admin.userName,
    });
  }

  /** PATCH /api/users/:id/deactivate - Desactivar usuario */
  @ApiOperation({
    summary: 'Desactivar usuario',
    description:
      'No se puede desactivar al último usuario admin activo del sistema.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  @ApiResponse({ status: 400, description: 'Es el último admin activo' })
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @GetUser() admin: User) {
    return this.usersService.deactivate(id, {
      id: admin.id,
      userName: admin.userName,
    });
  }

  /** PATCH /api/users/:id/reset-password - Blanqueo de contraseña */
  @ApiOperation({ summary: 'Blanquear la contraseña de un usuario' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @Patch(':id/reset-password')
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @GetUser() admin: User,
  ) {
    await this.usersService.resetPassword(id, resetPasswordDto.newPassword, {
      id: admin.id,
      userName: admin.userName,
    });
    return { message: 'Password reset successfully' };
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      userName: user.userName,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      userRoles: user.userRoles?.map((userRole) => ({
        role: userRole.role,
        assignedAt: userRole.assignedAt,
      })),
    };
  }
}
