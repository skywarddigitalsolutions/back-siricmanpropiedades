import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SeedHistory } from './entities/seed-history.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { getSeedUsers, SEED_ROLES } from './data/initial-data';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private readonly SEED_NAME = 'initial-seed-v1';

  constructor(
    @InjectRepository(SeedHistory)
    private readonly seedHistoryRepository: Repository<SeedHistory>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.runSeed();
  }

  async runSeed() {
    try {
      const runSeed = this.configService.get<string>('RUN_SEED');
      if (runSeed !== 'true') {
        this.logger.warn('Seed disabled. Set RUN_SEED=true to enable.');
        return;
      }

      const seedExists = await this.seedHistoryRepository.findOne({
        where: { name: this.SEED_NAME },
      });

      if (seedExists) {
        this.logger.log(`Seed '${this.SEED_NAME}' already executed.`);
        return;
      }

      this.logger.log('Running initial seed...');

      await this.createRoles();
      await this.createUsers();

      const seedHistory = this.seedHistoryRepository.create({
        name: this.SEED_NAME,
        status: 'success',
      });
      await this.seedHistoryRepository.save(seedHistory);

      this.logger.log('Seed completed successfully.');
    } catch (error) {
      this.logger.error('Seed failed:', error);
      throw error;
    }
  }

  private async createRoles() {
    for (const roleName of SEED_ROLES) {
      const existing = await this.roleRepository.findOne({
        where: { name: roleName },
      });
      if (!existing) {
        const role = this.roleRepository.create({ name: roleName });
        await this.roleRepository.save(role);
        this.logger.log(`  + Role '${roleName}' created`);
      } else {
        this.logger.log(`  - Role '${roleName}' already exists`);
      }
    }
  }

  private async createUsers() {
    const adminPassword = this.configService.get<string>('SEED_ADMIN_PASSWORD');
    const managerPassword = this.configService.get<string>(
      'SEED_MANAGER_PASSWORD',
    );
    const userPassword = this.configService.get<string>('SEED_USER_PASSWORD');

    if (!adminPassword || !managerPassword || !userPassword) {
      throw new Error(
        'Missing seed passwords: SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD, SEED_USER_PASSWORD',
      );
    }

    // Las contraseñas del .env.example son públicas (están en el repo).
    // En producción, sembrar con esos valores dejaría cuentas con
    // credenciales conocidas por cualquiera.
    const knownDefaults = ['Admin1234!', 'Manager1234!', 'User1234!'];
    const usesDefaults = [adminPassword, managerPassword, userPassword].some(
      (password) => knownDefaults.includes(password),
    );
    if (usesDefaults && process.env.NODE_ENV === 'production') {
      throw new Error(
        'Refusing to seed in production with the default passwords from .env.example. Set unique SEED_*_PASSWORD values.',
      );
    }

    const seedUsers = getSeedUsers(
      adminPassword,
      managerPassword,
      userPassword,
    );

    for (const seedUser of seedUsers) {
      const existing = await this.userRepository.findOne({
        where: { userName: seedUser.userName },
      });

      if (existing) {
        this.logger.log(`  - User '${seedUser.userName}' already exists`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(seedUser.password, 10);
      const user = this.userRepository.create({
        userName: seedUser.userName,
        password: hashedPassword,
        isActive: true,
      });
      await this.userRepository.save(user);

      const role = await this.roleRepository.findOne({
        where: { name: seedUser.role },
      });

      if (role) {
        const userRole = this.userRoleRepository.create({
          userId: user.id,
          roleId: role.id,
        });
        await this.userRoleRepository.save(userRole);
        this.logger.log(
          `  + User '${seedUser.userName}' created with role '${seedUser.role}'`,
        );
      }
    }
  }
}
