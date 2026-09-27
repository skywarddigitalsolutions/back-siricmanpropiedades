import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto';
import { UserRolesService } from './user-roles.service';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userRolesService: UserRolesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Crear usuario con rol asignado (solo admin)
   */
  async create(
    createUserDto: CreateUserDto,
    actor?: AuditActor,
  ): Promise<User> {
    const { userName, password, roleId } = createUserDto;

    await this.validateUniqueUserName(userName);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      userName,
      password: hashedPassword,
    });
    const savedUser = await this.userRepository.save(user);

    await this.userRolesService.assignRole(savedUser.id, roleId, actor);

    await this.auditLogService.record({
      actor,
      action: AuditAction.USER_CREATED,
      entityType: 'user',
      entityId: savedUser.id,
      metadata: { userName: savedUser.userName },
    });

    return this.findOne(savedUser.id);
  }

  /**
   * Listar usuarios con filtros opcionales
   */
  async findAll(filters?: {
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .orderBy('user.createdAt', 'DESC');

    if (filters?.isActive !== undefined)
      query.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    if (filters?.limit) query.take(filters.limit);
    if (filters?.offset) query.skip(filters.offset);

    return query.getMany();
  }

  /**
   * Obtener usuario por ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Activar usuario
   */
  async activate(id: string, actor?: AuditActor): Promise<User> {
    const user = await this.findOne(id);
    if (user.isActive) throw new BadRequestException('User is already active');
    user.isActive = true;
    const savedUser = await this.userRepository.save(user);

    await this.auditLogService.record({
      actor,
      action: AuditAction.USER_ACTIVATED,
      entityType: 'user',
      entityId: id,
    });

    return savedUser;
  }

  /**
   * Desactivar usuario
   */
  async deactivate(id: string, actor?: AuditActor): Promise<User> {
    const user = await this.findOne(id);
    if (!user.isActive)
      throw new BadRequestException('User is already inactive');
    await this.userRolesService.validateCanDeactivateUser(id);
    user.isActive = false;
    const savedUser = await this.userRepository.save(user);

    await this.auditLogService.record({
      actor,
      action: AuditAction.USER_DEACTIVATED,
      entityType: 'user',
      entityId: id,
    });

    return savedUser;
  }

  /**
   * Blanqueo de contraseña (admin)
   */
  async resetPassword(
    id: string,
    newPassword: string,
    actor?: AuditActor,
  ): Promise<void> {
    const user = await this.findOne(id);
    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    await this.auditLogService.record({
      actor,
      action: AuditAction.USER_PASSWORD_RESET,
      entityType: 'user',
      entityId: id,
    });
  }

  private async validateUniqueUserName(userName: string): Promise<void> {
    const normalized = userName.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { userName: normalized },
    });
    if (existing)
      throw new BadRequestException(`Username "${userName}" is already taken`);
  }
}
