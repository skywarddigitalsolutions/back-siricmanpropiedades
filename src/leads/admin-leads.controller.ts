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
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { AdminLeadFiltersDto, UpdateLeadDto } from './dto/admin-lead.dto';
import { AdminLeadResponse } from './lead.mapper';
import { Paginated } from '../common/interfaces/paginated.interface';
import { Auth, GetUser, RoleProtected } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';
import { User } from '../users/entities/user.entity';

/**
 * Bandeja de consultas del panel. admin y manager leen y actualizan; borrar
 * es solo para admin (`@RoleProtected` a nivel de método reemplaza los roles
 * de la clase, igual que en propiedades).
 */
@ApiTags('Admin Leads')
@Controller('admin/leads')
@Auth(ValidRoles.admin, ValidRoles.manager)
export class AdminLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @ApiOperation({ summary: 'Listar consultas (más recientes primero)' })
  @Get()
  findAll(
    @Query() filters: AdminLeadFiltersDto,
  ): Promise<Paginated<AdminLeadResponse>> {
    return this.leadsService.findAll(filters);
  }

  @ApiOperation({ summary: 'Ver una consulta' })
  @ApiResponse({ status: 404, description: 'No existe' })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AdminLeadResponse> {
    return this.leadsService.findOne(id);
  }

  @ApiOperation({ summary: 'Cambiar estado o notas de una consulta' })
  @ApiResponse({ status: 400, description: 'Validación o sin cambios' })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
    @GetUser() actor: User,
  ): Promise<AdminLeadResponse> {
    return this.leadsService.update(id, dto, {
      id: actor.id,
      userName: actor.userName,
    });
  }

  @ApiOperation({ summary: 'Eliminar una consulta (solo admin)' })
  @RoleProtected(ValidRoles.admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
  ): Promise<void> {
    return this.leadsService.remove(id, {
      id: actor.id,
      userName: actor.userName,
    });
  }
}
