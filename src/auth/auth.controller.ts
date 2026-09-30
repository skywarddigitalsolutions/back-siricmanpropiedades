import { Controller, Post, Body, Get, Header, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginUserDto } from './dto';
import { User } from '../users/entities/user.entity';
import { Auth, GetUser } from './decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login con username y password (público).
   * Limitado a 5 intentos por minuto por IP y a 5 fallos por cuenta
   * cada 15 minutos, para dificultar fuerza bruta.
   * POST /api/auth/login
   */
  @ApiOperation({
    summary: 'Login',
    description:
      'Según el estado de MFA de la cuenta, devuelve una de tres formas: ' +
      'sesión completa (`token`), `mfaRequired` + `mfaToken` (falta completar ' +
      'el segundo factor) o `mfaSetupRequired` + `setupToken` (admin sin MFA ' +
      'todavía, debe darla de alta antes de poder usar la API). No existe ' +
      'registro público: los usuarios los crea un admin vía POST /api/users.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Sesión completa, MFA pendiente de verificar, o alta de MFA obligatoria',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas o cuenta inactiva',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Más de 5 intentos por minuto (IP) o cuenta bloqueada por fallos',
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  /**
   * Renovar token (requiere token válido). El token usado queda revocado:
   * la renovación es una rotación, no una copia.
   * GET /api/auth/check-status
   */
  @ApiOperation({
    summary: 'Renovar el token del usuario autenticado',
    description:
      'Rota el token: el que se usó para llamar queda revocado y se devuelve uno nuevo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo token con expiración renovada',
  })
  @Get('check-status')
  @Auth()
  checkAuthStatus(
    @GetUser() user: User,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');
    return this.authService.checkAuthStatus(user, token);
  }

  /**
   * Usuario de la sesión actual (requiere token de sesión completa).
   * No rota ni revoca el token: a diferencia de check-status, puede
   * llamarse repetidas veces sin efectos secundarios.
   * GET /api/auth/me
   */
  @ApiOperation({
    summary: 'Usuario de la sesión actual',
    description:
      'No rota ni revoca el token. Rechaza tokens con scope (mfa_verify/mfa_setup).',
  })
  @ApiResponse({
    status: 200,
    description: '{ id, userName, isActive, roles }',
  })
  @Get('me')
  @Auth()
  @Header('Cache-Control', 'no-store')
  me(@GetUser() user: User) {
    return this.authService.toSessionUser(user);
  }

  /**
   * Cerrar sesión: revoca el token actual (requiere token válido)
   * POST /api/auth/logout
   */
  @ApiOperation({
    summary: 'Logout',
    description:
      'Revoca el token actual (por jti); queda inválido de inmediato aunque no haya expirado.',
  })
  @ApiResponse({ status: 201, description: 'Sesión cerrada' })
  @Post('logout')
  @Auth()
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '');
    await this.authService.logout(token);
    return { message: 'Logged out successfully' };
  }
}
