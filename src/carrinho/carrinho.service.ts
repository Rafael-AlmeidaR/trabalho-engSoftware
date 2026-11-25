import { Injectable } from '@nestjs/common';
import { EstoqueService, ItemSolicitado } from '../estoque/estoque.service';
import { paraNumero } from '../common/decimal';

/**
 * O carrinho fica no navegador do cliente (assim ele monta a compra antes de fazer login,
 * como pede o CA02.1). A API recalcula preços, subtotais, total e disponibilidade a partir
 * do banco, para o cliente nunca ver um valor desatualizado (RF07).
 */
@Injectable()
export class CarrinhoService {
  constructor(private readonly estoque: EstoqueService) {}

  async cotar(itensBrutos: ItemSolicitado[]) {
    const itens = this.estoque.agrupar(itensBrutos);
    const { variacoes, indisponiveis } = await this.estoque.verificar(itens);
    const linhas = itens.map((i) => {
      const v = variacoes.find((x) => x.id === i.variacaoId)!;
      const preco = paraNumero(v.produto.preco);
      return {
        variacaoId: v.id, produtoId: v.produtoId, produto: v.produto.nome, fotoUrl: v.produto.fotoUrl,
        tamanho: v.tamanho, cor: v.cor, quantidade: i.quantidade, disponivel: v.estoque,
        precoUnitario: preco, subtotal: paraNumero(preco * i.quantidade),
      };
    });
    const total = paraNumero(linhas.reduce((s, l) => s + l.subtotal, 0));
    return { itens: linhas, total, indisponiveis, podeFinalizar: indisponiveis.length === 0 };
  }
}
