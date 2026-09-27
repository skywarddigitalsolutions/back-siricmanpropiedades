import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RevokedToken } from '../entities/revoked-token.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RevokedToken)
    private readonly revokedTokenRepository: Repository<RevokedToken>,
    configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) throw new Error('JWT_SECRET is not configured');
    // Fail-fast en el arranque: un secreto corto o el placeholder del
    // .env.example harían firmables/falsificables todos los tokens.
    if (
      jwtSecret.length < 32 ||
      jwtSecret === 'your_super_secret_jwt_key_change_in_production'
    ) {
      throw new Error(
        'JWT_SECRET is too weak: use a random string of at least 32 characters (never the .env.example placeholder)',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { id, jti, scope } = payload;

    // Los tokens de alcance limitado (login pendiente de MFA) solo sirven
    // para los endpoints de /auth/mfa/*, que los validan manualmente.
    if (scope)
      throw new UnauthorizedException(
        'This token cannot be used to access this resource',
      );

    if (jti) {
      const revoked = await this.revokedTokenRepository.findOne({
        where: { jti },
      });
      if (revoked) throw new UnauthorizedException('Token has been revoked');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });

    if (!user) throw new UnauthorizedException('Token not valid');
    if (!user.isActive) throw new UnauthorizedException('User is not active');

    return user;
  }
}
