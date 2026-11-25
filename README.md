# Planta's Clothing

Loja online de roupas do grupo Planta's, feita no Projeto Integrador do curso Técnico em Informática para Internet (IFRS – Campus Rio Grande).

**Integrantes:** Giordano Zanetti, Rafael Rosa e Alisson de Andrade.

## Stack
- **API REST:** NestJS 11 (TypeScript)
- **ORM:** Prisma 7 (gerador `prisma-client` + driver adapter `@prisma/adapter-pg`)
- **Banco:** PostgreSQL no Neon
- **Autenticação:** JWT com Guards (`JwtAuthGuard` + `PerfisGuard`) e senhas com bcrypt
- **Front-end:** HTML, CSS e JavaScript (ES modules) servidos pela própria API, na pasta `web/`
- **Testes:** Jest + Supertest (e2e contra um banco real)

## Como rodar
```bash
npm install                 # também gera o Prisma Client
cp .env.example .env        # preencha DATABASE_URL com a connection string do Neon e o JWT_SECRET
npm run db:migrate          # cria as tabelas no Neon (prisma migrate deploy)
npm run seed                # dados de exemplo
npm run dev                 # http://localhost:3000
```

Usuários do seed (senha `plantas123`): `dono@plantas.com`, `vendedor@plantas.com`, `ana@email.com` (cliente).

## Testes
```bash
npm test
```
Os testes usam `DATABASE_URL_TEST` e **apagam** os dados desse banco a cada caso. Use um banco ou branch separado no Neon. Antes do primeiro uso, rode as migrations nele: `DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy`.

## Organização
```
src/
  auth/         login, cadastro do cliente, JWT, guards e decorators de perfil
  usuarios/     CRUD de clientes (vendedor/dono) e de funcionários (dono)
  produtos/     CRUD de roupas com variações e catálogo público
  estoque/      verificação e baixa de estoque, ajuste manual
  carrinho/     cotação do carrinho (preços, total e disponibilidade)
  pedidos/      finalizar compra (transação), meus pedidos
  relatorios/   estatísticas mensais de vendas
  prisma/       PrismaService (conexão com o banco)
web/            telas do cliente e da área administrativa
prisma/         schema, migrations e seed
test/           testes e2e (TC01–TC21)
```

## Endpoints principais
| Método | Rota | Perfil |
|---|---|---|
| POST | /api/auth/login · /api/auth/registro | público |
| GET | /api/produtos · /api/produtos/:id | público |
| POST/PATCH/DELETE | /api/produtos | vendedor, dono |
| PATCH | /api/variacoes/:id/estoque | vendedor, dono |
| POST | /api/carrinho/cotacao | público |
| POST | /api/pedidos | cliente |
| GET | /api/pedidos/meus · /api/pedidos/:numero | cliente (próprios) |
| CRUD | /api/clientes | vendedor, dono |
| CRUD | /api/funcionarios | dono |
| GET | /api/relatorios/vendas-mensais?ano=&mes= | dono |
