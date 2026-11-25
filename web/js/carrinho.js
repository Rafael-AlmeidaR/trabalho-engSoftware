/**
 * Carrinho guardado no navegador: o cliente monta a compra sem precisar estar logado
 * e não perde os itens ao fazer login (CA02.1). Preços e estoque vêm sempre da API.
 */
const CHAVE = 'plantas.carrinho';

/** Lê o carrinho descartando itens corrompidos (id ou quantidade que não sejam inteiros positivos). */
function ler() {
  try {
    const itens = JSON.parse(localStorage.getItem(CHAVE));
    if (!Array.isArray(itens)) return [];
    return itens.filter((i) => Number.isInteger(i?.variacaoId) && i.variacaoId > 0
      && Number.isInteger(i.quantidade) && i.quantidade > 0 && i.quantidade <= 1000);
  } catch { return []; }
}
function salvar(itens) { localStorage.setItem(CHAVE, JSON.stringify(itens)); }

export const carrinho = {
  itens: ler,
  quantidadeTotal: () => ler().reduce((s, i) => s + i.quantidade, 0),
  adicionar(variacaoId, quantidade = 1) {
    const itens = ler();
    const atual = itens.find((i) => i.variacaoId === variacaoId);
    if (atual) atual.quantidade += quantidade; else itens.push({ variacaoId, quantidade });
    salvar(itens);
  },
  definir(variacaoId, quantidade) {
    salvar(ler().map((i) => (i.variacaoId === variacaoId ? { ...i, quantidade } : i)));
  },
  remover(variacaoId) { salvar(ler().filter((i) => i.variacaoId !== variacaoId)); },
  limpar() { salvar([]); },
};

/**
 * Cota o carrinho na API. Se uma peça saiu do catálogo (404 com variacaoId), tira ela do
 * carrinho e tenta de novo, em vez de travar a tela. Devolve { cotacao, removidos }.
 */
export async function cotarCarrinho(api) {
  let removidos = 0;
  for (;;) {
    const itens = ler();
    if (!itens.length) return { cotacao: null, removidos };
    try {
      return { cotacao: await api('/carrinho/cotacao', { metodo: 'POST', corpo: { itens } }), removidos };
    } catch (err) {
      const id = err.dados?.variacaoId;
      if (err.status !== 404 || !itens.some((i) => i.variacaoId === id)) throw err;
      carrinho.remover(id);
      removidos++;
    }
  }
}
