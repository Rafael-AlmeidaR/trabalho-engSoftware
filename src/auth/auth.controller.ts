import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegistroDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsuarioAtual, UsuarioToken } from './usuario-atual.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioAtual() usuario: UsuarioToken) {
    return usuario;
  }
}
