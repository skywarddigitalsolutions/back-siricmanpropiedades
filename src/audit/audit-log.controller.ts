import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { Auth } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';

/**
 * Consulta de auditoría - solo admin
 */
@ApiTags('Audit logs')
@Controller('audit-logs')
@Auth(ValidRoles.admin)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  /** GET /api/audit-logs?entityType=user&actorId=uuid&limit=20&offset=0 */
  @ApiOperation({
    summary: 'Historial de acciones auditadas',
    description:
      'Creación/activación/desactivación de usuarios, reseteo de contraseña, ' +
      'asignación de roles, alta/baja de MFA. actorId=null indica una acción ' +
      'del propio sistema (no aplica hoy, ningún cron escribe en esta tabla).',
  })
  @ApiQuery({ name: 'entityType', required: false, example: 'user' })
  @ApiQuery({ name: 'actorId', required: false, format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({ status: 200, description: 'Listado paginado de auditoría' })
  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('actorId', new ParseUUIDPipe({ optional: true })) actorId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.auditLogService.findAll({ entityType, actorId, limit, offset });
  }
}
