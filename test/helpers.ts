import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configurarApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export async function criarApp() {
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication();
  configurarApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** Limpa o banco de testes e cria usuários e peças conhecidos. */
export async function prepararBanco(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "PedidoItem","Pedido","Variacao","Produto","Usuario" RESTART IDENTITY CASCADE',
  );
  const senhaHash = await bcrypt.hash('plantas123', 4);
  await prisma.usuario.createMany({
    data: [
      { nome: 'Dono', email: 'dono@teste.com', senhaHash, perfil: 'DONO' },
      { nome: 'Vendedor', email: 'vendedor@teste.com', senhaHash, perfil: 'VENDEDOR' },
      { nome: 'Ana', email: 'ana@teste.com', senhaHash, perfil: 'CLIENTE' },
      { nome: 'Bruno', email: 'bruno@teste.com', senhaHash, perfil: 'CLIENTE' },
    ],
  });
  const camiseta = await prisma.produto.create({
    data: {
      nome: 'Camiseta Raiz', categoria: 'Camisetas', preco: 79.9,
      variacoes: { create: [
        { tamanho: 'M', cor: 'Preta', estoque: 4 },
        { tamanho: 'GG', cor: 'Preta', estoque: 0 },
      ] },
    },
    include: { variacoes: { orderBy: { id: 'asc' } } },
  });
  const moletom = await prisma.produto.create({
    data: {
      nome: 'Moletom Folha', categoria: 'Moletons', preco: 189.9,
      variacoes: { create: [{ tamanho: 'G', cor: 'Verde', estoque: 1 }] },
    },
    include: { variacoes: true },
  });
  return {
    camisetaM: camiseta.variacoes[0].id,
    camisetaGG: camiseta.variacoes[1].id,
    moletomG: moletom.variacoes[0].id,
    camisetaId: camiseta.id,
  };
}

export async function token(app: INestApplication, email: string, senha = 'plantas123') {
  const r = await request(app.getHttpServer()).post('/api/auth/login').send({ email, senha });
  return r.body.token as string;
}
