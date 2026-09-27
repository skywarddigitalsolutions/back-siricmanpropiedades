import { SetMetadata } from '@nestjs/common';
import { META_ROLES } from '../helpers/meta-helpers';
import { ValidRoles } from '../interfaces';

/**
 * Establece los roles requeridos en los metadata del endpoint.
 * Usado internamente por el decorador @Auth().
 */
export const RoleProtected = (...args: ValidRoles[]) => {
  return SetMetadata(META_ROLES, args);
};
