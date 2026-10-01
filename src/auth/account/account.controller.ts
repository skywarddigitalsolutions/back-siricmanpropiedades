import { Body, Controller, Headers, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { AccountService } from './account.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegenerateBackupCodesDto } from './dto/regenerate-backup-codes.dto';
import { Auth, GetUser } from '../decorators';
import { User } from '../../users/entities/user.entity';

/** Autoservicio de la cuenta propia (cualquier rol autenticado). */
@ApiTags('Account')
@Controller('auth')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @ApiOperation({
    summary: 'Cambiar la propia contraseña',
    description:
      'Exige la contraseña actual y, con MFA, un código TOTP o de respaldo. ' +
      'Invalida todas las demás sesiones y devuelve una sesión nueva ' +
      '({ ...usuario, token }); el token usado queda revocado.',
  })
  @ApiResponse({ status: 200, description: 'Sesión nueva' })
  @ApiResponse({
    status: 400,
    description: 'Contraseña actual o código incorrectos, o política',
  })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('password')
  @Auth()
  changePassword(
    @Body() dto: ChangePasswordDto,
    @GetUser() user: User,
    @Headers('authorization') authHeader: string,
  ) {
    const token = authHeader?.replace('Bearer ', '');
    return this.accountService.changePassword(user, token, dto);
  }

  @ApiOperation({
    summary: 'Regenerar los códigos de respaldo de MFA',
    description:
      'Exige un código TOTP vigente. Reemplaza los códigos anteriores y ' +
      'devuelve los nuevos en texto plano una única vez.',
  })
  @ApiResponse({ status: 201, description: '{ backupCodes: string[10] }' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('mfa/backup-codes')
  @Auth()
  regenerateBackupCodes(
    @Body() dto: RegenerateBackupCodesDto,
    @GetUser() user: User,
  ) {
    return this.accountService.regenerateBackupCodes(user, dto.code);
  }
}
