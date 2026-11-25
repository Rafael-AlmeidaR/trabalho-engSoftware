import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const pecas = [
  { nome: 'Camiseta Raiz', categoria: 'Camisetas', preco: 79.9, foto: 'camiseta-raiz',
    descricao: 'Camiseta 100% algodão com estampa frontal da coleção Planta\'s.',
    variacoes: [['P', 'Preta', 6], ['M', 'Preta', 4], ['G', 'Preta', 5], ['GG', 'Preta', 0], ['M', 'Off-white', 3]] },
  { nome: 'Camiseta Broto', categoria: 'Camisetas', preco: 79.9, foto: 'camiseta-broto',
    descricao: 'Camiseta básica com bordado do broto no peito.',
    variacoes: [['P', 'Off-white', 4], ['M', 'Off-white', 7], ['G', 'Off-white', 2]] },
  { nome: 'Moletom Folha', categoria: 'Moletons', preco: 189.9, foto: 'moletom-folha',
    descricao: 'Moletom flanelado com capuz e estampa de folha nas costas.',
    variacoes: [['M', 'Verde', 3], ['G', 'Verde', 1], ['G', 'Preto', 4]] },
  { nome: 'Calça Cargo', categoria: 'Calças', preco: 159.9, foto: 'calca-cargo',
    descricao: 'Calça cargo de sarja com bolsos laterais.',
    variacoes: [['38', 'Bege', 3], ['40', 'Bege', 2], ['42', 'Preta', 2]] },
  { nome: 'Boné Planta\'s', categoria: 'Acessórios', preco: 69.9, foto: 'bone',
    descricao: 'Boné aba curva com logo bordado.',
    variacoes: [['U', 'Preto', 8], ['U', 'Verde', 5]] },
  { nome: 'Regata Musgo', categoria: 'Camisetas', preco: 59.9, foto: 'regata-musgo',
    descricao: 'Regata leve em malha canelada.',
    variacoes: [['M', 'Verde musgo', 0], ['G', 'Verde musgo', 0]] },
];

async function main() {
  await prisma.pedidoItem.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.variacao.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.usuario.deleteMany();

  const hash = await bcrypt.hash('plantas123', 10);
  await prisma.usuario.createMany({
    data: [
      { nome: 'Dono Planta\'s', email: 'dono@plantas.com', senhaHash: hash, perfil: 'DONO' },
      { nome: 'Vendedor Planta\'s', email: 'vendedor@plantas.com', senhaHash: hash, perfil: 'VENDEDOR' },
      { nome: 'Ana Souza', email: 'ana@email.com', senhaHash: hash, perfil: 'CLIENTE',
        telefone: '(53) 99999-0000', endereco: 'Rua das Flores, 120 · Rio Grande/RS' },
    ],
  });

  for (const p of pecas) {
    await prisma.produto.create({
      data: {
        nome: p.nome, categoria: p.categoria, preco: p.preco, descricao: p.descricao,
        fotoUrl: `/img/pecas/${p.foto}.jpg`,
        variacoes: { create: p.variacoes.map(([tamanho, cor, estoque]) => ({
          tamanho: String(tamanho), cor: String(cor), estoque: Number(estoque),
        })) },
      },
    });
  }
  console.log('Seed concluído: 3 usuários (senha plantas123) e', pecas.length, 'peças.');
}

main().finally(() => prisma.$disconnect());
