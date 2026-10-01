import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../users/entities/user.entity';
import { RevokedToken } from './entities/revoked-token.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginThrottleService } from './login-throttle.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User, RevokedToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_EXPIRES_IN',
            '60m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginThrottleService],
  exports: [
    AuthService,
    LoginThrottleService,
    JwtStrategy,
    TypeOrmModule,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
