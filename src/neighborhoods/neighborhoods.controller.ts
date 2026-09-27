import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NeighborhoodsService } from './neighborhoods.service';
import { CreateNeighborhoodDto } from './dto';
import { Auth, GetUser } from '../auth/decorators';
import { ValidRoles } from '../auth/interfaces';
import { User } from '../users/entities/user.entity';

@ApiTags('Neighborhoods')
@Controller('neighborhoods')
export class NeighborhoodsController {
  constructor(private readonly neighborhoodsService: NeighborhoodsService) {}

  /** GET /api/neighborhoods - Listado público de barrios */
  @ApiOperation({ summary: 'Listar barrios (público)' })
  @ApiResponse({ status: 200, description: 'Listado de barrios' })
  @Get()
  findAll() {
    return this.neighborhoodsService.findAll();
  }

  /** POST /api/neighborhoods - Crear barrio (admin o manager) */
  @ApiOperation({ summary: 'Crear un nuevo barrio' })
  @ApiResponse({ status: 201, description: 'Barrio creado' })
  @ApiResponse({ status: 400, description: 'Nombre duplicado o inválido' })
  @Auth(ValidRoles.admin, ValidRoles.manager)
  @Post()
  create(
    @Body() createNeighborhoodDto: CreateNeighborhoodDto,
    @GetUser() actor: User,
  ) {
    return this.neighborhoodsService.create(createNeighborhoodDto, {
      id: actor.id,
      userName: actor.userName,
    });
  }
}
