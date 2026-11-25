import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Perfil } from '../generated/prisma/enums';

export interface UsuarioToken {
  id: number;
  email: string;
  nome: string;
  perfil: Perfil;
}

export const UsuarioAtual = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): UsuarioToken => ctx.switchToHttp().getRequest().usuario,
);
