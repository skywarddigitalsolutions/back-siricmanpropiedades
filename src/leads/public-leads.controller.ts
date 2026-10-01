import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

/**
 * Formularios del sitio público. Sin `@Auth`: cualquiera puede escribir, con
 * un límite estricto por IP (el BFF de Next reenvía la IP del visitante).
 */
@ApiTags('Leads')
@Controller('leads')
export class PublicLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /** POST /api/leads - Enviar una consulta desde el sitio */
  @ApiOperation({ summary: 'Enviar una consulta (público)' })
  @ApiResponse({ status: 201, description: 'Consulta recibida' })
  @ApiResponse({
    status: 400,
    description: 'Validación o propiedad inexistente',
  })
  @ApiResponse({ status: 429, description: 'Demasiados envíos seguidos' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  async submit(@Body() dto: CreateLeadDto): Promise<{ received: true }> {
    // Same answer when the honeypot drops the lead, so bots learn nothing.
    await this.leadsService.submit(dto);
    return { received: true };
  }
}
