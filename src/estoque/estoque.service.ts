import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

export interface ItemSolicitado {
  variacaoId: number;
  quantidade: number;
}

export interface ItemIndisponivel {
  variacaoId: number;
  produto: string;
  tamanho: string;
  cor: string;
  solicitado: number;
  disponivel: number;
}

/** Regras de estoque por variação (RF05). Usado pelo carrinho e pela finalização da compra. */
@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  /** Soma quantidades repetidas da mesma variação. */
  agrupar(itens: ItemSolicitado[]): ItemSolicitado[] {
    const mapa = new Map<number, number>();
    for (const i of itens) mapa.set(i.variacaoId, (mapa.get(i.variacaoId) ?? 0) + i.quantidade);
    return [...mapa].map(([variacaoId, quantidade]) => ({ variacaoId, quantidade }));
  }

  /** Lista os itens sem estoque suficiente (sem alterar nada). */
  async verificar(itens: ItemSolicitado[], db: Prisma.TransactionClient = this.prisma) {
    const variacoes = await db.variacao.findMany({
      where: { id: { in: itens.map((i) => i.variacaoId) } },
      include: { produto: true },
    });
    const indisponiveis: ItemIndisponivel[] = [];
    for (const item of itens) {
      const v = variacoes.find((x) => x.id === item.variacaoId);
      if (!v || !v.produto.ativo) {
        // variacaoId vai no corpo para o front tirar do carrinho uma peça que saiu do catálogo.
        throw new NotFoundException({
          statusCode: 404, message: 'Uma das peças do carrinho não está mais disponível', variacaoId: item.variacaoId,
        });
      }
      if (v.estoque < item.quantidade) {
        indisponiveis.push({
          variacaoId: v.id, produto: v.produto.nome, tamanho: v.tamanho, cor: v.cor,
          solicitado: item.quantidade, disponivel: v.estoque,
        });
      }
    }
    return { variacoes, indisponiveis };
  }

  /**
   * Dá baixa no estoque dentro de uma transação. O UPDATE só acontece se ainda houver
   * quantidade suficiente (estoque >= solicitado), o que evita vender a mesma unidade
   * duas vezes quando duas compras chegam ao mesmo tempo (RNF03).
   */
  async baixar(tx: Prisma.TransactionClient, itens: ItemSolicitado[]) {
    const falhas: number[] = [];
    for (const item of itens) {
      const r = await tx.variacao.updateMany({
        where: { id: item.variacaoId, estoque: { gte: item.quantidade } },
        data: { estoque: { decrement: item.quantidade } },
      });
      if (r.count === 0) falhas.push(item.variacaoId);
    }
    if (falhas.length) {
      const { indisponiveis } = await this.verificar(
        itens.filter((i) => falhas.includes(i.variacaoId)), tx,
      );
      throw new ConflictException({ message: 'Estoque insuficiente', itens: indisponiveis });
    }
  }

  async ajustar(variacaoId: number, estoque: number) {
    const v = await this.prisma.variacao.findUnique({ where: { id: variacaoId } });
    if (!v) throw new NotFoundException('Variação não encontrada');
    return this.prisma.variacao.update({ where: { id: variacaoId }, data: { estoque } });
  }
}
