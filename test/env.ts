import 'dotenv/config';
// Os testes usam um banco separado para não apagar os dados de desenvolvimento.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? 'postgresql://postgres@localhost:5432/plantas_test';
process.env.JWT_SECRET = 'segredo-de-teste';
