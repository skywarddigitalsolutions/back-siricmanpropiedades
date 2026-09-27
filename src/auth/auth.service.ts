import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { LoginUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { RevokedToken } from './entities/revoked-token.entity';
import { LoginThrottleService } from './login-throttle.service';

@Injectable()
export class AuthService {
  /**
   * Hash "señuelo" precalculado una única vez al arrancar el servicio.
   * Se usa para comparar contraseñas cuando el usuario no existe, de forma
   * que el tiempo de respuesta del login no permita distinguir (por timing)
   * si un userName existe o no.
   */
  private readonly dummyPasswordHash = bcrypt.hashSync(
    'timing-attack-mitigation',
    10,
  );

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    private readonly jwtService: JwtService,
    private readonly loginThrottleService: LoginThrottleService,
  ) {}

  /**
   * Login: valida credenciales y retorna token JWT (o un token intermedio
   * si falta completar MFA). Devuelve siempre el mismo mensaje de error
   * para evitar enumeración de usuarios (no revela si el userName no
   * existe, la password es incorrecta o la cuenta está inactiva).
   */
  async login(loginUserDto: LoginUserDto) {
    const { userName, password } = loginUserDto;

    // Bloqueo por cuenta (además del rate limit por IP del ThrottlerGuard).
    this.loginThrottleService.assertNotLocked(userName);

    const user = await this.userRepository.findOne({
      where: { userName: userName.toLowerCase().trim() },
      select: {
        id: true,
        userName: true,
        password: true,
        isActive: true,
        mfaEnabled: true,
      },
      relations: ['userRoles', 'userRoles.role'],
    });

    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? this.dummyPasswordHash,
    );

    if (!user || !isPasswordValid || !user.isActive) {
      this.loginThrottleService.recordFailure(userName);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.loginThrottleService.recordSuccess(userName);

    const isAdmin = user.userRoles.some(
      (userRole) => userRole.role?.name.toLowerCase() === 'admin',
    );

    // Admin sin MFA activo: no se entrega sesión completa hasta que
    // termine el alta obligatoria (ver auth/mfa).
    if (isAdmin && !user.mfaEnabled) {
      return {
        mfaSetupRequired: true,
        setupToken: this.getScopedToken(user.id, 'mfa_setup', 15 * 60),
      };
    }

    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        mfaToken: this.getScopedToken(user.id, 'mfa_verify', 5 * 60),
      };
    }

    return this.buildSessionResponse(user);
  }

  /**
   * Respuesta de sesión completa, reutilizada por login() (sin MFA) y por
   * el endpoint de verificación de MFA una vez validado el segundo factor.
   */
  buildSessionResponse(user: User) {
    return {
      id: user.id,
      userName: user.userName,
      isActive: user.isActive,
      roles: this.getRoleNames(user),
      token: this.getJwtToken(user.id),
    };
  }

  /**
   * Verifica un token (de sesión completa o de alcance limitado) y
   * devuelve el usuario si el scope está entre los permitidos para la
   * operación que lo llama. Usado por los endpoints de /auth/mfa que no
   * pueden pasar por el AuthGuard('jwt') estándar (ese rechaza cualquier
   * token con scope, ver JwtStrategy.validate).
   */
  async resolveUserFromToken(
    token: string,
    allowedScopes: Array<JwtPayload['scope']>,
  ): Promise<User> {
    const payload = this.verifyToken(token);

    if (!allowedScopes.includes(payload.scope)) {
      throw new UnauthorizedException(
        'This token cannot be used for this operation',
      );
    }

    if (payload.jti) {
      const revoked = await this.revokedTokenRepository.findOne({
        where: { jti: payload.jti },
      });
      if (revoked) throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.id },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new UnauthorizedException('Token not valid');
    if (!user.isActive) throw new UnauthorizedException('User is not active');

    return user;
  }

  private verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getScopedToken(
    userId: string,
    scope: NonNullable<JwtPayload['scope']>,
    expiresInSeconds: number,
  ): string {
    const payload: JwtPayload = { id: userId, jti: randomUUID(), scope };
    return this.jwtService.sign(payload, { expiresIn: expiresInSeconds });
  }

  /**
   * Renueva el token del usuario autenticado ROTÁNDOLO: el token con el
   * que se llamó queda revocado. Así un token robado no puede renovarse
   * en paralelo con el legítimo indefinidamente.
   */
  async checkAuthStatus(user: User, currentToken: string) {
    await this.logout(currentToken);

    return {
      id: user.id,
      userName: user.userName,
      isActive: user.isActive,
      roles: this.getRoleNames(user),
      token: this.getJwtToken(user.id),
    };
  }

  /**
   * Revoca el token actual (logout). El token queda inválido de inmediato
   * aunque no haya expirado todavía (ver JwtStrategy.validate).
   */
  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode<
      (JwtPayload & { exp?: number }) | null
    >(token);

    if (!decoded?.jti) return;

    // Limpieza oportunista de tokens revocados ya expirados.
    await this.revokedTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });

    const expiresAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);

    const revokedToken = this.revokedTokenRepository.create({
      jti: decoded.jti,
      expiresAt,
    });
    await this.revokedTokenRepository.save(revokedToken);
  }

  private getRoleNames(user: User): string[] {
    return (user.userRoles ?? [])
      .map((userRole) => userRole.role?.name)
      .filter((name): name is string => Boolean(name));
  }

  private getJwtToken(userId: string): string {
    const payload: JwtPayload = { id: userId, jti: randomUUID() };
    return this.jwtService.sign(payload);
  }
}
