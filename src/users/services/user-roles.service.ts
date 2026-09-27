import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../../user-roles/entities/user-role.entity';
import { Role } from '../../roles/entities/role.entity';
import { AuditLogService } from '../../audit/audit-log.service';
import { AuditAction } from '../../audit/enums/audit-action.enum';
import { AuditActor } from '../../audit/interfaces/audit-actor.interface';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Asignar rol a un usuario.
   * Por defecto no permite asignar el rol 'admin' directamente.
   */
  async assignRole(
    userId: string,
    roleId: string,
    actor?: AuditActor,
  ): Promise<UserRole> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.name.toLowerCase() === 'admin')
      throw new BadRequestException('Cannot assign admin role directly');

    const alreadyAssigned = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });
    if (alreadyAssigned)
      throw new BadRequestException('User already has this role');

    const userRole = this.userRoleRepository.create({ userId, roleId });
    const savedUserRole = await this.userRoleRepository.save(userRole);

    await this.auditLogService.record({
      actor,
      action: AuditAction.ROLE_ASSIGNED,
      entityType: 'user',
      entityId: userId,
      metadata: { roleId, roleName: role.name },
    });

    return savedUserRole;
  }

  /**
   * Obtener roles de un usuario
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
  }

  /**
   * Verificar si un usuario tiene un rol específico (entre todos sus roles asignados)
   */
  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const count = await this.userRoleRepository
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .where('ur.userId = :userId', { userId })
      .andWhere('LOWER(role.name) = LOWER(:roleName)', { roleName })
      .getCount();

    return count > 0;
  }

  /**
   * Valida que no se pueda desactivar al último admin activo
   */
  async validateCanDeactivateUser(userId: string): Promise<void> {
    const isAdmin = await this.hasRole(userId, 'admin');
    if (!isAdmin) return;

    const activeAdminsCount = await this.userRoleRepository
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'role')
      .innerJoin('ur.user', 'user')
      .where('LOWER(role.name) = :roleName', { roleName: 'admin' })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getCount();

    if (activeAdminsCount <= 1)
      throw new BadRequestException(
        'Cannot deactivate the only active admin user',
      );
  }
}
