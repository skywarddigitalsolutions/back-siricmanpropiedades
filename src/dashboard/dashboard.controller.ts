import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { Auth } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';

/** Resumen del panel de inicio para admin y manager. */
@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@Auth(ValidRoles.admin, ValidRoles.manager)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Resumen: consultas, propiedades y últimas consultas',
  })
  @Get()
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }
}
