import { INestApplication } from '@nestjs/common';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { criarApp, prepararBanco, token } from './helpers';

// Menor PNG válido (1x1) e um JPEG mínimo (só a assinatura importa para o servidor).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const arquivoDe = (url: string) => join(__dirname, '..', 'web', url);

describe('Fotos das peças', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ids: Awaited<ReturnType<typeof prepararBanco>>;
  let t: string;
  const criados: string[] = [];
  const api = () => request(app.getHttpServer());
  const enviar = (buf: Buffer, nome = 'foto.png', tk = t) =>
    api().post('/api/produtos/fotos').set('Authorization', `Bearer ${tk}`).attach('foto', buf, nome);
  const editar = (fotoUrl: string | null) => api().put(`/api/produtos/${ids.camisetaId}`).set('Authorization', `Bearer ${t}`).send({
    nome: 'Camiseta Raiz', categoria: 'Camisetas', preco: 79.9, fotoUrl,
    variacoes: [{ id: ids.camisetaM, tamanho: 'M', cor: 'Preta', estoque: 4 }, { id: ids.camisetaGG, tamanho: 'GG', cor: 'Preta', estoque: 0 }],
  });

  beforeAll(async () => ({ app, prisma } = await criarApp()));
  beforeEach(async () => {
    ids = await prepararBanco(prisma);
    t = await token(app, 'vendedor@teste.com');
  });
  afterAll(async () => {
    for (const u of criados) if (existsSync(arquivoDe(u))) unlinkSync(arquivoDe(u));
    await app.close();
  });

  it('TC31 vendedor envia foto PNG/JPG e ela é servida pelo site', async () => {
    const r = await enviar(PNG).expect(201);
    criados.push(r.body.url);
    expect(r.body.url).toMatch(/^\/img\/produtos\/[0-9a-f-]{36}\.png$/);
    expect(existsSync(arquivoDe(r.body.url))).toBe(true);
    const j = await enviar(JPG, 'x.jpg').expect(201);
    criados.push(j.body.url);
    expect(j.body.url).toMatch(/\.jpg$/);
  });

  it('TC32 arquivo que não é imagem é recusado, mesmo com nome .jpg', async () => {
    const r = await enviar(Buffer.from('<script>alert(1)</script>'), 'falsa.jpg').expect(400);
    expect(r.body.message[0]).toContain('Formato não aceito');
    await api().post('/api/produtos/fotos').set('Authorization', `Bearer ${t}`).expect(400);
  });

  it('TC33 cliente e visitante não enviam fotos', async () => {
    await enviar(PNG, 'f.png', await token(app, 'ana@teste.com')).expect(403);
    await api().post('/api/produtos/fotos').attach('foto', PNG, 'f.png').expect(401);
  });

  it('TC34 trocar e remover a foto da peça apaga o arquivo antigo; foto externa é recusada', async () => {
    const a = (await enviar(PNG).expect(201)).body.url;
    const b = (await enviar(PNG).expect(201)).body.url;
    criados.push(a, b);
    expect((await editar(a).expect(200)).body.fotoUrl).toBe(a);
    await editar(b).expect(200);
    expect(existsSync(arquivoDe(a))).toBe(false);
    expect((await editar(null).expect(200)).body.fotoUrl).toBeNull();
    expect(existsSync(arquivoDe(b))).toBe(false);
    const r = await editar('https://site-qualquer.com/x.jpg').expect(400);
    expect(r.body.message).toContain('Foto inválida. Envie a imagem pelo formulário da peça');
  });
});
