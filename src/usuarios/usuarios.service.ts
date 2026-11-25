import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Perfil } from '../generated/prisma/enums';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './dto/usuario.dto';

/** Campos devolvidos pela API: a senha (hash) nunca sai do servidor (RNF01). */
const PUBLICO = {
  id: true, nome: true, email: true, telefone: true, endereco: true,
  perfil: true, ativo: true, criadoEm: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarUsuarioDto & { perfil: Perfil }) {
    const email = dto.email.toLowerCase();
    if (await this.prisma.usuario.findUnique({ where: { email } })) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const { senha, ...dados } = dto;
    return this.prisma.usuario.create({
      data: { ...dados, email, senhaHash: await bcrypt.hash(senha, 10) },
      select: PUBLICO,
    });
  }

  listar(perfis: Perfil[]) {
    return this.prisma.usuario.findMany({
      where: { perfil: { in: perfis }, ativo: true },
      select: PUBLICO,
      orderBy: { nome: 'asc' },
    });
  }

  async buscar(id: number, perfis: Perfil[]) {
    const u = await this.prisma.usuario.findFirst({
      where: { id, perfil: { in: perfis }, ativo: true },
      select: PUBLICO,
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    return u;
  }

  async atualizar(id: number, perfis: Perfil[], dto: AtualizarUsuarioDto) {
    await this.buscar(id, perfis);
    const { senha, ...dados } = dto;
    if (dados.email) {
      dados.email = dados.email.toLowerCase();
      const outro = await this.prisma.usuario.findUnique({ where: { email: dados.email } });
      if (outro && outro.id !== id) throw new ConflictException('E-mail já cadastrado');
    }
    return this.prisma.usuario.update({
      where: { id },
      data: { ...dados, ...(senha ? { senhaHash: await bcrypt.hash(senha, 10) } : {}) },
      select: PUBLICO,
    });
  }

  /** Exclusão lógica: preserva o histórico de pedidos e impede novos logins (CA05.2). */
  async excluir(id: number, perfis: Perfil[]) {
    await this.buscar(id, perfis);
    await this.prisma.usuario.update({ where: { id }, data: { ativo: false } });
  }
}
