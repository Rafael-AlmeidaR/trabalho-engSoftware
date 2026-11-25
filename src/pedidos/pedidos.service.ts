import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstoqueService, ItemSolicitado } from '../estoque/estoque.service';
import { paraNumero } from '../common/decimal';
import { Perfil } from '../generated/prisma/enums';
import { UsuarioToken } from '../auth/usuario-atual.decorator';

const INCLUIR = {
  itens: { include: { variacao: { include: { produto: true } } } },
  usuario: { select: { id: true, nome: true, email: true, endereco: true } },
} as const;

type PedidoCompleto = {
  id: number; total: unknown; criadoEm: Date;
  usuario: { id: number; nome: string; email: string; endereco: string | null };
  itens: {
    quantidade: number; precoUnitario: unknown; variacaoId: number;
    variacao: { tamanho: string; cor: string; produto: { nome: string } };
  }[];
};

function formatar(p: PedidoCompleto) {
  return {
    numero: p.id,
    criadoEm: p.criadoEm,
    cliente: p.usuario,
    total: paraNumero(p.total),
    itens: p.itens.map((i) => ({
      variacaoId: i.variacaoId, produto: i.variacao.produto.nome,
      tamanho: i.variacao.tamanho, cor: i.variacao.cor, quantidade: i.quantidade,
      precoUnitario: paraNumero(i.precoUnitario),
      subtotal: paraNumero(Number(i.precoUnitario) * i.quantidade),
    })),
  };
}

@Injectable()
export class PedidosService {
  constructor(private readonly prisma: PrismaService, private readonly estoque: EstoqueService) {}

  /**
   * Finaliza a compra (RF08 / HU02): numa única transação dá baixa no estoque de cada
   * item e registra a venda. Se faltar estoque, nada é gravado (RNF03) e a API responde
   * 409 com a lista de itens indisponíveis (CA02.2).
   */
  async finalizar(usuarioId: number, itensBrutos: ItemSolicitado[]) {
    const itens = this.estoque.agrupar(itensBrutos);
    const pedido = await this.prisma.$transaction(async (tx) => {
      await this.estoque.baixar(tx, itens);
      const variacoes = await tx.variacao.findMany({
        where: { id: { in: itens.map((i) => i.variacaoId) } },
        include: { produto: true },
      });
      const linhas = itens.map((i) => {
        const v = variacoes.find((x) => x.id === i.variacaoId)!;
        return { variacaoId: v.id, quantidade: i.quantidade, precoUnitario: v.produto.preco };
      });
      const total = linhas.reduce((s, l) => s + Number(l.precoUnitario) * l.quantidade, 0);
      return tx.pedido.create({
        data: { usuarioId, total: paraNumero(total), itens: { create: linhas } },
        include: INCLUIR,
      });
    });
    return formatar(pedido);
  }

  async meus(usuarioId: number) {
    const pedidos = await this.prisma.pedido.findMany({
      where: { usuarioId }, include: INCLUIR, orderBy: { criadoEm: 'desc' },
    });
    return pedidos.map(formatar);
  }

  async buscar(numero: number, usuario: UsuarioToken) {
    const p = await this.prisma.pedido.findUnique({ where: { id: numero }, include: INCLUIR });
    if (!p) throw new NotFoundException('Pedido não encontrado');
    if (usuario.perfil === Perfil.CLIENTE && p.usuarioId !== usuario.id) {
      throw new ForbiddenException('Este pedido pertence a outro cliente');
    }
    return formatar(p);
  }
}
