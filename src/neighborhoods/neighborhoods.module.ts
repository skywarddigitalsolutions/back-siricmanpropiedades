import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Neighborhood } from './entities/neighborhood.entity';
import { NeighborhoodsController } from './neighborhoods.controller';
import { NeighborhoodsService } from './neighborhoods.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Neighborhood]), AuthModule, AuditModule],
  controllers: [NeighborhoodsController],
  providers: [NeighborhoodsService],
  exports: [NeighborhoodsService, TypeOrmModule],
})
export class NeighborhoodsModule {}
