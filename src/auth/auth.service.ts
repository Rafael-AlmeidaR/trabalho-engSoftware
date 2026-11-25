import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { Perfil } from '../generated/prisma/enums';
import { LoginDto, RegistroDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly usuarios: UsuariosService,
  ) {}

  async login({ email, senha }: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;
    if (!usuario || !senhaOk || !usuario.ativo) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.emitirToken(usuario);
  }

  /** Cadastro do próprio cliente (RF02). */
  async registrar(dto: RegistroDto) {
    const usuario = await this.usuarios.criar({ ...dto, perfil: Perfil.CLIENTE });
    return this.emitirToken(usuario);
  }

  private async emitirToken(u: { id: number; nome: string; email: string; perfil: Perfil }) {
    const token = await this.jwt.signAsync({ sub: u.id, perfil: u.perfil });
    return { token, usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil } };
  }
}
