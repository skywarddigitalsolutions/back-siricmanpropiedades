import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { PUBLIC_READ_THROTTLE } from '../common/constants/public-read-throttle.constants';

/**
 * Liveness/readiness probe for the external uptime monitor. No `@Auth`: the
 * monitor treats 4xx/5xx as "down", so a protected route cannot be watched.
 * The body never carries error details.
 */
@ApiTags('Health')
@Throttle(PUBLIC_READ_THROTTLE)
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly dataSource: DataSource) {}

  /** GET /api/health - 200 when the database answers, 503 otherwise */
  @ApiOperation({ summary: 'Estado de la API y la base de datos (público)' })
  @ApiResponse({ status: 200, description: 'API y base de datos operativas' })
  @ApiResponse({ status: 503, description: 'La base de datos no responde' })
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.logger.error(
        'Health check failed',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException({ status: 'error' });
    }
    return { status: 'ok' };
  }
}
