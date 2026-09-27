import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { SeedHistory } from './entities/seed-history.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeedHistory, Role, User, UserRole])],
  providers: [SeedService],
})
export class SeedModule {}
