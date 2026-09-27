import { applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ValidRoles } from '../interfaces';
import { RoleProtected } from './role-protected.decorator';
import { AuthGuard } from '@nestjs/passport';
import { UserRoleGuard } from '../guards/user-role/user-role.guard';

/**
 * Decorador combinado: valida JWT + verifica roles + documenta el
 * requisito de autenticación en Swagger (esquema "access-token").
 *
 * Uso:
 *   @Auth()                          - Solo requiere estar autenticado
 *   @Auth(ValidRoles.admin)          - Solo admins
 *   @Auth(ValidRoles.admin, ValidRoles.manager) - Admin o Manager
 */
export function Auth(...roles: ValidRoles[]) {
  return applyDecorators(
    RoleProtected(...roles),
    UseGuards(AuthGuard('jwt'), UserRoleGuard),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({
      description: 'Token faltante, inválido, expirado o revocado',
    }),
    ...(roles.length
      ? [
          ApiForbiddenResponse({
            description: `Autenticado pero sin el rol requerido (${roles.join(', ')})`,
          }),
        ]
      : []),
  );
}
