import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Perfil } from '../generated/prisma/enums';
import { PERFIS_KEY } from './perfis.decorator';

/** Bloqueia o acesso quando o perfil do usuário não está entre os permitidos (RF01). */
@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const permitidos = this.reflector.getAllAndOverride<Perfil[]>(PERFIS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!permitidos?.length) return true;
    const { usuario } = ctx.switchToHttp().getRequest();
    if (!usuario || !permitidos.includes(usuario.perfil)) {
      throw new ForbiddenException('Acesso negado para o seu perfil');
    }
    return true;
  }
}
