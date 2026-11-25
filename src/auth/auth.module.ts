import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PerfisGuard } from './perfis.guard';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Global()
@Module({
  imports: [
    UsuariosModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'troque-este-segredo',
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PerfisGuard],
  exports: [JwtAuthGuard, PerfisGuard],
})
export class AuthModule {}
