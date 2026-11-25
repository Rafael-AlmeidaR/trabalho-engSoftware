import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paraNumero } from '../common/decimal';

/**
 * A loja opera no horário de Brasília (UTC-3, sem horário de verão desde 2019), mas o banco
 * guarda as datas em UTC. Por isso o mês começa às 03:00 UTC do dia 1º.
 */
const OFFSET_BRASILIA_HORAS = 3;
const inicioDoMes = (ano: number, mes: number) =>
  new Date(Date.UTC(ano, mes - 1, 1, OFFSET_BRASILIA_HORAS));

/** Estatísticas mensais de vendas para o dono (RF09 / HU04). */
@Injectable()
export class RelatoriosService {
  constructor(private readonly prisma: PrismaService) {}

  async vendasMensais(ano: number, mes: number) {
    const inicio = inicioDoMes(ano, mes);
    const fim = inicioDoMes(ano, mes + 1);
    const periodo = { criadoEm: { gte: inicio, lt: fim } };

    const resumo = await this.prisma.pedido.aggregate({ where: periodo, _count: true, _sum: { total: true } });
    const itens = await this.prisma.pedidoItem.findMany({
      where: { pedido: periodo },
      include: { variacao: { include: { produto: true } } },
    });

    const porProduto = new Map<number, { produtoId: number; produto: string; quantidade: number; faturado: number }>();
    for (const i of itens) {
      const p = i.variacao.produto;
      const atual = porProduto.get(p.id) ?? { produtoId: p.id, produto: p.nome, quantidade: 0, faturado: 0 };
      atual.quantidade += i.quantidade;
      atual.faturado = paraNumero(atual.faturado + Number(i.precoUnitario) * i.quantidade);
      porProduto.set(p.id, atual);
    }
    const maisVendidas = [...porProduto.values()]
      .sort((a, b) => b.quantidade - a.quantidade || b.faturado - a.faturado)
      .slice(0, 5);

    const quantidadeVendas = resumo._count;
    return {
      ano, mes,
      quantidadeVendas,
      totalFaturado: paraNumero(resumo._sum.total ?? 0),
      maisVendidas,
      mensagem: quantidadeVendas === 0 ? 'Nenhuma venda registrada neste mês' : null,
    };
  }
}
