import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { AuthService } from '../auth.service';
import { Auth, GetUser } from '../decorators';
import { User } from '../../users/entities/user.entity';
import {
  EnableMfaDto,
  ConfirmMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
} from './dto';

/**
 * Endpoints de MFA (TOTP). /enable y /confirm aceptan tanto un token de
 * sesión completa (alta voluntaria) como un token de alcance "mfa_setup"
 * (alta obligatoria de un admin sin MFA que todavía no tiene sesión
 * completa) — por eso no usan @Auth() y validan el token a mano.
 */
@ApiTags('MFA')
@Controller('auth/mfa')
export class MfaController {
  constructor(
    private readonly mfaService: MfaService,
    private readonly authService: AuthService,
  ) {}

  /** POST /api/auth/mfa/enable */
  @ApiOperation({
    summary: 'Iniciar alta de MFA',
    description:
      'Genera un secreto TOTP (sin confirmar) y devuelve la URI otpauth:// ' +
      'para armar el QR. Acepta un token de sesión completa (alta voluntaria) ' +
      'o un token de alcance "mfa_setup" (alta obligatoria de un admin). ' +
      'Además del token, exige la contraseña de la cuenta: un token robado ' +
      'no alcanza para inscribir MFA ajeno.',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'secret + otpauthUrl' })
  @ApiUnauthorizedResponse({
    description:
      'Token faltante/inválido/de alcance no permitido, o contraseña incorrecta',
  })
  @ApiTooManyRequestsResponse({ description: 'Más de 5 intentos por minuto' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('enable')
  async enable(
    @Body() dto: EnableMfaDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = await this.resolveEnrollmentUser(authHeader);
    return this.mfaService.startEnrollment(user.id, dto.password);
  }

  /** POST /api/auth/mfa/confirm */
  @ApiOperation({
    summary: 'Confirmar alta de MFA',
    description:
      'Valida el código TOTP generado a partir del secreto de /enable, activa ' +
      'MFA y devuelve 10 códigos de respaldo en texto plano (única vez).',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 201, description: 'backupCodes: string[10]' })
  @ApiUnauthorizedResponse({
    description: 'Token faltante, inválido o de alcance no permitido',
  })
  @ApiTooManyRequestsResponse({ description: 'Más de 5 intentos por minuto' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmMfaDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const user = await this.resolveEnrollmentUser(authHeader);
    return this.mfaService.confirmEnrollment(user.id, dto.code, {
      id: user.id,
      userName: user.userName,
    });
  }

  /** POST /api/auth/mfa/disable (requiere sesión completa) */
  @ApiOperation({
    summary: 'Desactivar MFA',
    description:
      'Requiere password + código (TOTP o de respaldo) vigente. Bloqueado ' +
      'para cuentas con rol admin (MFA es obligatorio para ellas).',
  })
  @ApiResponse({ status: 201, description: 'MFA desactivado' })
  @ApiResponse({
    status: 400,
    description: 'MFA no está habilitado, o la cuenta es admin',
  })
  @ApiTooManyRequestsResponse({ description: 'Más de 5 intentos por minuto' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('disable')
  @Auth()
  async disable(@Body() dto: DisableMfaDto, @GetUser() user: User) {
    await this.mfaService.disable(user.id, dto.password, dto.code, {
      id: user.id,
      userName: user.userName,
    });
    return { message: 'MFA disabled successfully' };
  }

  /** POST /api/auth/mfa/verify - segundo paso del login (público) */
  @ApiOperation({
    summary: 'Segundo paso del login (con MFA ya habilitado)',
    description:
      'Recibe el "mfaToken" devuelto por /auth/login y un código (TOTP o de ' +
      'respaldo). El mfaToken se revoca al usarse, sea cual sea el resultado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sesión completa (mismo shape que /auth/login exitoso)',
  })
  @ApiUnauthorizedResponse({
    description: 'mfaToken inválido/expirado/revocado, o código incorrecto',
  })
  @ApiTooManyRequestsResponse({ description: 'Más de 5 intentos por minuto' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  async verify(@Body() dto: VerifyMfaDto) {
    const user = await this.authService.resolveUserFromToken(dto.mfaToken, [
      'mfa_verify',
    ]);

    const isValid = await this.mfaService.verifyLoginCode(user.id, dto.code);
    if (!isValid) throw new UnauthorizedException('Invalid code');

    // El mfaToken ya cumplió su propósito: se revoca para que no sea reutilizable.
    await this.authService.logout(dto.mfaToken);

    return this.authService.buildSessionResponse(user);
  }

  private async resolveEnrollmentUser(authHeader?: string): Promise<User> {
    const token = authHeader?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('Missing authorization token');

    return this.authService.resolveUserFromToken(token, [
      undefined,
      'mfa_setup',
    ]);
  }
}
