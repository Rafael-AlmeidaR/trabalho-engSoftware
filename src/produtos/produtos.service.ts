import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FotosService } from './fotos.service';
import { paraNumero } from '../common/decimal';
import { AtualizarProdutoDto, CriarProdutoDto, EditarProdutoDto, FiltroCatalogoDto } from './dto/produto.dto';

type ProdutoComVariacoes = {
  id: number; nome: string; descricao: string | null; categoria: string; preco: unknown;
  fotoUrl: string | null; ativo: boolean;
  variacoes: { id: number; tamanho: string; cor: string; estoque: number }[];
};

/** Formata a peça para a API: preço como número e indicação de esgotado (CA03.2). */
function formatar(p: ProdutoComVariacoes) {
  const estoqueTotal = p.variacoes.reduce((s, v) => s + v.estoque, 0);
  return {
    ...p,
    preco: paraNumero(p.preco),
    estoqueTotal,
    esgotado: estoqueTotal === 0,
    variacoes: p.variacoes.map((v) => ({ ...v, esgotado: v.estoque === 0 })),
  };
}

/** Mesma combinação de tamanho e cor duas vezes violaria a chave única do banco (erro 500). */
function recusarRepetidas(variacoes: { tamanho: string; cor: string }[]) {
  const vistas = new Set<string>();
  const repetidas = new Set<string>();
  for (const v of variacoes) {
    const chave = `${v.tamanho.toUpperCase()}|${v.cor.toLowerCase()}`;
    if (vistas.has(chave)) repetidas.add(`${v.tamanho} / ${v.cor}`);
    vistas.add(chave);
  }
  if (repetidas.size) {
    throw new BadRequestException([`Variação repetida: ${[...repetidas].join(', ')}. Junte o estoque numa linha só`]);
  }
}

/** Chave para comparar categorias: sem maiúsculas, acentos nem o "s" do plural ("Calça" = "calcas"). */
const chaveCategoria = (t: string) =>
  t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '');

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService, private readonly fotos: FotosService) {}

  /** Catálogo público com filtros por categoria e tamanho (RF06). */
  async catalogo(filtro: FiltroCatalogoDto) {
    const produtos = await this.prisma.produto.findMany({
      where: {
        ativo: true,
        ...(filtro.categoria ? { categoria: filtro.categoria } : {}),
        ...(filtro.tamanho ? { variacoes: { some: { tamanho: filtro.tamanho } } } : {}),
      },
      include: { variacoes: { orderBy: { id: 'asc' } } },
      orderBy: { nome: 'asc' },
    });
    return produtos.map(formatar);
  }

  /** Se já existe uma categoria equivalente, usa a grafia dela (evita "Calça" e "Calças" separadas). */
  private async categoriaExistente(categoria: string) {
    const existentes = await this.categorias();
    return existentes.find((c) => chaveCategoria(c) === chaveCategoria(categoria)) ?? categoria;
  }

  async categorias() {
    const linhas = await this.prisma.produto.findMany({
      where: { ativo: true }, distinct: ['categoria'], select: { categoria: true }, orderBy: { categoria: 'asc' },
    });
    return linhas.map((l) => l.categoria);
  }

  async detalhe(id: number) {
    const p = await this.prisma.produto.findFirst({
      where: { id, ativo: true },
      include: { variacoes: { orderBy: { id: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Peça não encontrada');
    return formatar(p);
  }

  /** Cadastro da peça já com as variações e o estoque inicial (RF04, RF05, HU03). */
  async criar(dto: CriarProdutoDto) {
    const { variacoes, ...dados } = dto;
    dados.categoria = await this.categoriaExistente(dados.categoria);
    recusarRepetidas(variacoes);
    const p = await this.prisma.produto.create({
      data: { ...dados, variacoes: { create: variacoes } },
      include: { variacoes: true },
    });
    return formatar(p);
  }

  /**
   * Edição completa da peça numa única transação: dados, estoque das variações existentes,
   * variações novas (sem id) e removidas (as que não vieram na lista). Se algo falhar, nada muda.
   * Tamanho e cor de uma variação existente não mudam, para não reescrever pedidos antigos.
   */
  async editar(id: number, dto: EditarProdutoDto) {
    const { variacoes, ...dados } = dto;
    dados.categoria = await this.categoriaExistente(dados.categoria);
    let fotoAntiga: string | null = null;
    const resultado = await this.prisma.$transaction(async (tx) => {
      const atual = await tx.produto.findFirst({
        where: { id, ativo: true },
        include: { variacoes: { include: { _count: { select: { itens: true } } } } },
      });
      if (!atual) throw new NotFoundException('Peça não encontrada');
      fotoAntiga = atual.fotoUrl;

      const existentes = new Map(atual.variacoes.map((v) => [v.id, v]));
      const ids = variacoes.filter((v) => v.id !== undefined).map((v) => v.id!);
      if (new Set(ids).size !== ids.length) throw new BadRequestException(['A mesma variação foi enviada duas vezes']);
      const estranha = ids.find((i) => !existentes.has(i));
      if (estranha) throw new BadRequestException([`A variação ${estranha} não pertence a esta peça. Recarregue a página`]);

      // Variações existentes mantêm tamanho e cor do banco; a checagem de repetidas usa esses valores.
      const finais = variacoes.map((v) => (v.id ? { ...v, tamanho: existentes.get(v.id)!.tamanho, cor: existentes.get(v.id)!.cor } : v));
      recusarRepetidas(finais);

      const removidas = atual.variacoes.filter((v) => !ids.includes(v.id));
      const vendidas = removidas.filter((v) => v._count.itens > 0);
      if (vendidas.length) {
        throw new ConflictException([
          `${vendidas.map((v) => `${v.tamanho} / ${v.cor}`).join(', ')} já ${vendidas.length > 1 ? 'têm' : 'tem'} pedidos e não pode ser removida. Zere o estoque para tirar da venda`,
        ]);
      }

      await tx.produto.update({ where: { id }, data: { ...dados, descricao: dados.descricao ?? null, fotoUrl: dados.fotoUrl ?? null } });
      if (removidas.length) await tx.variacao.deleteMany({ where: { id: { in: removidas.map((v) => v.id) } } });
      for (const v of finais) {
        if (v.id) await tx.variacao.update({ where: { id: v.id }, data: { estoque: v.estoque } });
        else await tx.variacao.create({ data: { produtoId: id, tamanho: v.tamanho, cor: v.cor, estoque: v.estoque } });
      }
      const p = await tx.produto.findUniqueOrThrow({ where: { id }, include: { variacoes: { orderBy: { id: 'asc' } } } });
      return formatar(p);
    });
    // Só depois de gravar: a foto trocada ou removida deixa de ocupar espaço.
    if (fotoAntiga !== resultado.fotoUrl) await this.fotos.apagar(fotoAntiga);
    return resultado;
  }

  async atualizar(id: number, dto: AtualizarProdutoDto) {
    const antes = await this.detalhe(id);
    if (dto.categoria) dto.categoria = await this.categoriaExistente(dto.categoria);
    const p = await this.prisma.produto.update({ where: { id }, data: dto, include: { variacoes: true } });
    if (dto.fotoUrl !== undefined && antes.fotoUrl !== p.fotoUrl) await this.fotos.apagar(antes.fotoUrl);
    return formatar(p);
  }

  /** Exclusão lógica: a peça sai do catálogo, mas os pedidos antigos continuam válidos. */
  async excluir(id: number) {
    await this.detalhe(id);
    await this.prisma.produto.update({ where: { id }, data: { ativo: false } });
  }
}
