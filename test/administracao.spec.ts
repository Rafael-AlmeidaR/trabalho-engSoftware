import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarApp, prepararBanco, token } from './helpers';

describe('Acesso e administração (RF01–RF04, HU03, HU05)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => ({ app, prisma } = await criarApp()));
  beforeEach(async () => { await prepararBanco(prisma); });
  afterAll(() => app.close());

  it('TC10 [RF01] login com senha errada é recusado', async () => {
    const r = await api().post('/api/auth/login').send({ email: 'ana@teste.com', senha: 'errada' }).expect(401);
    expect(r.body.message).toBe('E-mail ou senha inválidos');
  });

  it('TC11 [RF02/RNF01] cliente cria a própria conta e a senha é salva com hash', async () => {
    const r = await api().post('/api/auth/registro')
      .send({ nome: 'Carla', email: 'carla@teste.com', senha: 'segura1' }).expect(201);
    expect(r.body.token).toBeDefined();
    expect(r.body.usuario.perfil).toBe('CLIENTE');
    const salvo = await prisma.usuario.findUnique({ where: { email: 'carla@teste.com' } });
    expect(salvo!.senhaHash).not.toBe('segura1');
    expect(salvo!.senhaHash.startsWith('$2')).toBe(true);
  });

  it('TC12 [CA03.1] cadastro de peça sem campos obrigatórios é recusado com mensagens por campo', async () => {
    const t = await token(app, 'vendedor@teste.com');
    const r = await api().post('/api/produtos').set('Authorization', `Bearer ${t}`)
      .send({ descricao: 'sem nome' }).expect(400);
    const msgs: string[] = r.body.message;
    expect(msgs).toEqual(expect.arrayContaining([
      'Informe o nome da peça', 'Informe a categoria', 'Informe um preço maior que zero',
      'Informe ao menos uma variação (tamanho, cor e estoque)',
    ]));
  });

  it('TC13 [HU03] vendedor cadastra peça com variações e ela aparece no catálogo', async () => {
    const t = await token(app, 'vendedor@teste.com');
    await api().post('/api/produtos').set('Authorization', `Bearer ${t}`).send({
      nome: 'Boné Planta\'s', categoria: 'Acessórios', preco: 69.9,
      variacoes: [{ tamanho: 'U', cor: 'Preto', estoque: 8 }, { tamanho: 'U', cor: 'Verde', estoque: 0 }],
    }).expect(201);
    const cat = await api().get('/api/produtos?categoria=Acessórios').expect(200);
    expect(cat.body[0].nome).toBe('Boné Planta\'s');
    expect(cat.body[0].variacoes.map((v: any) => v.esgotado)).toEqual([false, true]);
  });

  it('TC14 [RF01] cliente não pode cadastrar peças (403)', async () => {
    const t = await token(app, 'ana@teste.com');
    await api().post('/api/produtos').set('Authorization', `Bearer ${t}`).send({
      nome: 'X', categoria: 'Y', preco: 1, variacoes: [{ tamanho: 'M', cor: 'Azul', estoque: 1 }],
    }).expect(403);
  });

  it('TC15 [CA05.1] dono não consegue cadastrar funcionário com e-mail repetido', async () => {
    const t = await token(app, 'dono@teste.com');
    const r = await api().post('/api/funcionarios').set('Authorization', `Bearer ${t}`)
      .send({ nome: 'Outro', email: 'vendedor@teste.com', senha: 'abcdef', perfil: 'VENDEDOR' }).expect(409);
    expect(r.body.message).toBe('E-mail já cadastrado');
  });

  it('TC16 [CA05.2] funcionário excluído não consegue mais fazer login', async () => {
    const t = await token(app, 'dono@teste.com');
    const vendedor = await prisma.usuario.findUnique({ where: { email: 'vendedor@teste.com' } });
    const tokenAntigo = await token(app, 'vendedor@teste.com');
    await api().delete(`/api/funcionarios/${vendedor!.id}`).set('Authorization', `Bearer ${t}`).expect(204);
    await api().post('/api/auth/login').send({ email: 'vendedor@teste.com', senha: 'plantas123' }).expect(401);
    await api().get('/api/auth/me').set('Authorization', `Bearer ${tokenAntigo}`).expect(401);
  });

  it('TC17 [RF02] vendedor lista clientes e a resposta não expõe a senha', async () => {
    const t = await token(app, 'vendedor@teste.com');
    const r = await api().get('/api/clientes').set('Authorization', `Bearer ${t}`).expect(200);
    expect(r.body).toHaveLength(2);
    expect(r.body[0].senhaHash).toBeUndefined();
  });
});
