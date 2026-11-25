import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarApp, prepararBanco, token } from './helpers';

describe('Edição e validação de peças (RF04, RF05)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: Awaited<ReturnType<typeof prepararBanco>>;
  let t: string;
  const api = () => request(app.getHttpServer());
  const put = (corpo: object, id = ids.camisetaId) =>
    api().put(`/api/produtos/${id}`).set('Authorization', `Bearer ${t}`).send(corpo);
  const base = () => ({ nome: 'Camiseta Raiz', categoria: 'Camisetas', preco: 79.9 });

  beforeAll(async () => ({ app, prisma } = await criarApp()));
  beforeEach(async () => {
    ids = await prepararBanco(prisma);
    t = await token(app, 'vendedor@teste.com');
  });
  afterAll(() => app.close());

  it('TC22 edita dados, ajusta estoque, adiciona e remove variação numa só operação', async () => {
    const r = await put({
      nome: '  Camiseta Raiz 2  ', descricao: 'Nova', categoria: 'Camisetas', preco: 89.9,
      variacoes: [
        { id: ids.camisetaM, tamanho: 'M', cor: 'Preta', estoque: 10 },
        { tamanho: 'p', cor: 'Branca', estoque: 3 },
      ],
    }).expect(200);
    expect(r.body).toMatchObject({ nome: 'Camiseta Raiz 2', descricao: 'Nova', preco: 89.9, estoqueTotal: 13 });
    expect(r.body.variacoes.map((v: any) => `${v.tamanho}/${v.cor}/${v.estoque}`)).toEqual(['M/Preta/10', 'P/Branca/3']);
    expect(await prisma.variacao.findUnique({ where: { id: ids.camisetaGG } })).toBeNull();
  });

  it('TC23 tamanho e cor de variação existente não mudam (preserva pedidos antigos)', async () => {
    const r = await put({ ...base(), variacoes: [
      { id: ids.camisetaM, tamanho: 'XG', cor: 'Rosa', estoque: 2 },
      { id: ids.camisetaGG, tamanho: 'GG', cor: 'Preta', estoque: 0 },
    ] }).expect(200);
    expect(r.body.variacoes[0]).toMatchObject({ id: ids.camisetaM, tamanho: 'M', cor: 'Preta', estoque: 2 });
  });

  it('TC24 variação que já foi vendida não pode ser removida e nada é alterado', async () => {
    const tAna = await token(app, 'ana@teste.com');
    await api().post('/api/pedidos').set('Authorization', `Bearer ${tAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }] }).expect(201);
    const r = await put({ ...base(), nome: 'Mudou', variacoes: [{ id: ids.camisetaGG, tamanho: 'GG', cor: 'Preta', estoque: 5 }] }).expect(409);
    expect(r.body.message[0]).toContain('M / Preta já tem pedidos');
    const p = await prisma.produto.findUnique({ where: { id: ids.camisetaId }, include: { variacoes: true } });
    expect(p!.nome).toBe('Camiseta Raiz');
    expect(p!.variacoes).toHaveLength(2);
  });

  it('TC25 variação repetida (nova igual a existente) é recusada com 400, não 500', async () => {
    const r = await put({ ...base(), variacoes: [
      { id: ids.camisetaM, tamanho: 'M', cor: 'Preta', estoque: 1 },
      { id: ids.camisetaGG, tamanho: 'GG', cor: 'Preta', estoque: 0 },
      { tamanho: 'm', cor: 'preta', estoque: 1 },
    ] }).expect(400);
    expect(r.body.message[0]).toContain('Variação repetida');
  });

  it('TC26 variação de outra peça é recusada', async () => {
    await put({ ...base(), variacoes: [{ id: ids.moletomG, tamanho: 'G', cor: 'Verde', estoque: 1 }] }).expect(400);
  });

  it('TC27 cadastro recusa espaços em branco, preço/estoque fora do limite e duplicadas com mensagens claras', async () => {
    const post = (corpo: object) => api().post('/api/produtos').set('Authorization', `Bearer ${t}`).send(corpo);
    const r1 = await post({ nome: '   ', categoria: ' ', preco: 10.999, variacoes: [{ tamanho: ' ', cor: 'P', estoque: -1 }] }).expect(400);
    expect(r1.body.message).toEqual(expect.arrayContaining([
      'Informe o nome da peça', 'Informe a categoria', 'O preço deve ter no máximo 2 casas decimais',
      'Variação 1: Informe o tamanho da variação', 'Variação 1: O estoque não pode ser negativo',
    ]));
    const r2 = await post({ ...base(), preco: 1e12, variacoes: [{ tamanho: 'M', cor: 'P', estoque: 1e11 }] }).expect(400);
    expect(r2.body.message).toEqual(expect.arrayContaining(['O preço máximo é R$ 100.000,00', 'Variação 1: O estoque máximo por variação é 100000']));
    await post({ ...base(), variacoes: [{ tamanho: 'M', cor: 'Preta', estoque: 1 }, { tamanho: 'm', cor: 'PRETA', estoque: 1 }] }).expect(400);
  });

  it('TC29 categoria equivalente a uma existente usa a grafia dela (sem "Camiseta" e "Camisetas" separadas)', async () => {
    const r = await api().post('/api/produtos').set('Authorization', `Bearer ${t}`).send({
      nome: 'Camiseta Nova', categoria: '  camiseta ', preco: 50, variacoes: [{ tamanho: 'M', cor: 'Preta', estoque: 1 }],
    }).expect(201);
    expect(r.body.categoria).toBe('Camisetas');
    const cats = await api().get('/api/produtos/categorias').expect(200);
    expect(cats.body).toEqual(['Camisetas', 'Moletons']);
  });

  it('TC30 excluir peça tira do catálogo, mas os pedidos antigos continuam legíveis', async () => {
    const tAna = await token(app, 'ana@teste.com');
    const pedido = await api().post('/api/pedidos').set('Authorization', `Bearer ${tAna}`)
      .send({ itens: [{ variacaoId: ids.camisetaM, quantidade: 1 }] }).expect(201);
    await api().delete(`/api/produtos/${ids.camisetaId}`).set('Authorization', `Bearer ${tAna}`).expect(403);
    await api().delete(`/api/produtos/${ids.camisetaId}`).set('Authorization', `Bearer ${t}`).expect(204);
    await api().get(`/api/produtos/${ids.camisetaId}`).expect(404);
    const cat = await api().get('/api/produtos').expect(200);
    expect(cat.body.map((p: any) => p.nome)).toEqual(['Moletom Folha']);
    const r = await api().get(`/api/pedidos/${pedido.body.numero}`).set('Authorization', `Bearer ${tAna}`).expect(200);
    expect(r.body.itens[0].produto).toBe('Camiseta Raiz');
    await api().delete(`/api/produtos/${ids.camisetaId}`).set('Authorization', `Bearer ${t}`).expect(404);
  });

  it('TC28 cliente não edita peças', async () => {
    t = await token(app, 'ana@teste.com');
    await put({ ...base(), variacoes: [{ id: ids.camisetaM, tamanho: 'M', cor: 'Preta', estoque: 1 }] }).expect(403);
  });
});
