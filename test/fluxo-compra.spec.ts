import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarApp, prepararBanco, token } from './helpers';

describe('Fluxo de compra (HU01, HU02)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: Awaited<ReturnType<typeof prepararBanco>>;
  let tokenAna: string;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await criarApp()));
  beforeEach(async () => {
    ids = await prepararBanco(prisma);
    tokenAna = await token(app, 'ana@teste.com');
  });
  afterAll(() => app.close());

  it('TC01 [RF06] catálogo lista as peças e filtra por categoria e tamanho', async () => {
    const todas = await api().get('/api/produtos').expect(200);
    expect(todas.body).toHaveLength(2);
    const moletons = await api().get('/api/produtos?categoria=Moletons').expect(200);
    expect(moletons.body.map((p: any) => p.nome)).toEqual(['Moletom Folha']);
    const tamG = await api().get('/api/produtos?tamanho=G').expect(200);
    expect(tamG.body.map((p: any) => p.nome)).toEqual(['Moletom Folha']);
  });

  it('TC02 [CA03.2] variação com estoque zero vem marcada como esgotada', async () => {
    const r = await api().get(`/api/produtos/${ids.camisetaId}`).expect(200);
    const gg = r.body.variacoes.find((v: any) => v.tamanho === 'GG');
    expect(gg.esgotado).toBe(true);
  });

  it('TC03 [CA01.2/CA01.3] cotação do carrinho devolve subtotais e total recalculados', async () => {
    const r = await api().post('/api/carrinho/cotacao')
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 2 }, { variacaoId: ids.moletomG, quantidade: 1 }] })
      .expect(200);
    expect(r.body.total).toBe(349.7);
    expect(r.body.itens[0].subtotal).toBe(159.8);
    expect(r.body.podeFinalizar).toBe(true);
  });

  it('TC04 [CA01.3] carrinho aponta quantidade acima do estoque disponível', async () => {
    const r = await api().post('/api/carrinho/cotacao')
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 5 }] }).expect(200);
    expect(r.body.podeFinalizar).toBe(false);
    expect(r.body.indisponiveis[0]).toMatchObject({ produto: 'Camiseta Raiz', solicitado: 5, disponivel: 4 });
  });

  it('TC05 [CA02.1] finalizar compra sem login é recusado com 401', async () => {
    await api().post('/api/pedidos').send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }] }).expect(401);
  });

  it('TC06 [CA02.3] compra válida registra a venda, baixa o estoque e devolve o número do pedido', async () => {
    const r = await api().post('/api/pedidos').set('Authorization', `Bearer ${tokenAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }, { variacaoId: ids.moletomG, quantidade: 1 }] })
      .expect(201);
    expect(r.body.numero).toBeGreaterThan(0);
    expect(r.body.total).toBe(269.8);
    expect(r.body.itens).toHaveLength(2);
    const camiseta = await prisma.variacao.findUnique({ where: { id: ids.camisetaM } });
    const moletom = await prisma.variacao.findUnique({ where: { id: ids.moletomG } });
    expect(camiseta!.estoque).toBe(3);
    expect(moletom!.estoque).toBe(0);
  });

  it('TC07 [CA02.2] estoque insuficiente retorna 409 com os itens e não grava nada', async () => {
    const r = await api().post('/api/pedidos').set('Authorization', `Bearer ${tokenAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }, { variacaoId: ids.moletomG, quantidade: 2 }] })
      .expect(409);
    expect(r.body.itens[0]).toMatchObject({ produto: 'Moletom Folha', solicitado: 2, disponivel: 1 });
    expect(await prisma.pedido.count()).toBe(0);
    const camiseta = await prisma.variacao.findUnique({ where: { id: ids.camisetaM } });
    expect(camiseta!.estoque).toBe(4); // a baixa da camiseta foi desfeita junto (RNF03)
  });

  it('TC08 [RNF03] duas compras simultâneas da última unidade: só uma é aprovada', async () => {
    const tokenBruno = await token(app, 'bruno@teste.com');
    const corpo = { itens: [{ variacaoId: ids.moletomG, quantidade: 1 }] };
    const [a, b] = await Promise.all([
      api().post('/api/pedidos').set('Authorization', `Bearer ${tokenAna}`).send(corpo),
      api().post('/api/pedidos').set('Authorization', `Bearer ${tokenBruno}`).send(corpo),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    const moletom = await prisma.variacao.findUnique({ where: { id: ids.moletomG } });
    expect(moletom!.estoque).toBe(0);
    expect(await prisma.pedido.count()).toBe(1);
  });

  it('TC09 [HU02] cliente não consegue ver pedido de outro cliente', async () => {
    const r = await api().post('/api/pedidos').set('Authorization', `Bearer ${tokenAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }] }).expect(201);
    const tokenBruno = await token(app, 'bruno@teste.com');
    await api().get(`/api/pedidos/${r.body.numero}`).set('Authorization', `Bearer ${tokenBruno}`).expect(403);
    await api().get(`/api/pedidos/${r.body.numero}`).set('Authorization', `Bearer ${tokenAna}`).expect(200);
  });
});
