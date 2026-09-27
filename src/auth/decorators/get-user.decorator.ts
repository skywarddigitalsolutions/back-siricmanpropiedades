import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Extrae el usuario autenticado del request.
 *
 * Uso:
 *   @GetUser() user: User         - objeto completo
 *   @GetUser('userName') name: string - campo específico
 */
export const GetUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user)
      throw new InternalServerErrorException('User not found in request');

    if (!data) return user;
    return user[data];
  },
);
