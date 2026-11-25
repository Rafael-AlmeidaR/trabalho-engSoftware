import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarApp, prepararBanco, token } from './helpers';

describe('Estatísticas mensais (HU04)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await criarApp()));
  afterAll(() => app.close());

  it('TC18 [CA04.1] dono vê total faturado, nº de vendas e peças mais vendidas do mês', async () => {
    const ids = await prepararBanco(prisma);
    const tAna = await token(app, 'ana@teste.com');
    await api().post('/api/pedidos').set('Authorization', `Bearer ${tAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 2 }] }).expect(201);
    await api().post('/api/pedidos').set('Authorization', `Bearer ${tAna}`)
      .send({ itens: [{ variacaoId: ids.moletomG, quantidade: 1 }] }).expect(201);
    const agora = new Date();
    const tDono = await token(app, 'dono@teste.com');
    const r = await api().get(`/api/relatorios/vendas-mensais?ano=${agora.getUTCFullYear()}&mes=${agora.getUTCMonth() + 1}`)
      .set('Authorization', `Bearer ${tDono}`).expect(200);
    expect(r.body.quantidadeVendas).toBe(2);
    expect(r.body.totalFaturado).toBe(349.7);
    expect(r.body.maisVendidas[0]).toMatchObject({ produto: 'Camiseta Raiz', quantidade: 2 });
  });

  it('TC19 [CA04.2] mês sem vendas mostra mensagem e valores zerados', async () => {
    await prepararBanco(prisma);
    const tDono = await token(app, 'dono@teste.com');
    const r = await api().get('/api/relatorios/vendas-mensais?ano=2026&mes=1')
      .set('Authorization', `Bearer ${tDono}`).expect(200);
    expect(r.body).toMatchObject({ quantidadeVendas: 0, totalFaturado: 0, mensagem: 'Nenhuma venda registrada neste mês' });
  });

  it('TC20 [CA04.3] vendedor e cliente não acessam as estatísticas', async () => {
    await prepararBanco(prisma);
    for (const email of ['vendedor@teste.com', 'ana@teste.com']) {
      const t = await token(app, email);
      await api().get('/api/relatorios/vendas-mensais?ano=2026&mes=11').set('Authorization', `Bearer ${t}`).expect(403);
    }
  });

  it('TC21 [CA04.1] venda feita às 23h30 de 30/11 (horário de Brasília) conta em novembro', async () => {
    const ids = await prepararBanco(prisma);
    const ana = await prisma.usuario.findUnique({ where: { email: 'ana@teste.com' } });
    await prisma.pedido.create({
      data: {
        usuarioId: ana!.id, total: 79.9, criadoEm: new Date('2026-11-30T23:30:00-03:00'),
        itens: { create: [{ variacaoId: ids.camisetaM, quantidade: 1, precoUnitario: 79.9 }] },
      },
    });
    const tDono = await token(app, 'dono@teste.com');
    const nov = await api().get('/api/relatorios/vendas-mensais?ano=2026&mes=11')
      .set('Authorization', `Bearer ${tDono}`).expect(200);
    const dez = await api().get('/api/relatorios/vendas-mensais?ano=2026&mes=12')
      .set('Authorization', `Bearer ${tDono}`).expect(200);
    expect(nov.body.quantidadeVendas).toBe(1);
    expect(dez.body.quantidadeVendas).toBe(0);
  });
});
