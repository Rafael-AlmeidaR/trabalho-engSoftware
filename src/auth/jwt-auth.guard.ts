import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

/** Valida o token JWT do cabeçalho Authorization e confirma que o usuário segue ativo. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [tipo, token] = (req.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Faça login para continuar');

    let payload: { sub: number };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    const usuario = await this.prisma.usuario.findUnique({ where: { id: payload.sub } });
    if (!usuario || !usuario.ativo) throw new UnauthorizedException('Usuário sem acesso');

    req.usuario = { id: usuario.id, email: usuario.email, nome: usuario.nome, perfil: usuario.perfil };
    return true;
  }
}
