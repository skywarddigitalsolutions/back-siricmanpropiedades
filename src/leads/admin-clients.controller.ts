import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { clientsCsvFilename } from './helpers/csv';
import { ClientsService, ClientSummary } from './clients.service';
import {
  AdminClientExportDto,
  AdminClientFiltersDto,
} from './dto/admin-client.dto';
import { Paginated } from '../common/interfaces/paginated.interface';
import { Auth, GetUser } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';
import { User } from '../users/entities/user.entity';

/** Clients view (leads grouped by email) for admin and manager. */
@ApiTags('Admin Clients')
@Controller('admin/clients')
@Auth(ValidRoles.admin, ValidRoles.manager)
export class AdminClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: 'Clientes (consultas agrupadas por email)' })
  @Get()
  findAll(
    @Query() filters: AdminClientFiltersDto,
  ): Promise<Paginated<ClientSummary>> {
    return this.clientsService.findAll(filters);
  }

  @ApiOperation({ summary: 'Exportar clientes a CSV (auditado)' })
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Get('export.csv')
  exportCsv(
    @Query() filters: AdminClientExportDto,
    @GetUser() actor: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${clientsCsvFilename(new Date())}"`,
    );
    return this.clientsService.exportCsv(filters, {
      id: actor.id,
      userName: actor.userName,
    });
  }
}
