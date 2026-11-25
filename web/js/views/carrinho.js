import { api, reais } from '../api.js';
import { carrinho, cotarCarrinho } from '../carrinho.js';
import { sessao } from '../sessao.js';
import { esc, foto, ir } from '../util.js';

const avisoRemovidos = (n) => (n ? `<div class="alerta">${n === 1 ? 'Uma peça saiu do catálogo e foi removida' : `${n} peças saíram do catálogo e foram removidas`} do seu carrinho.</div>` : '');

/** Tela 3 — Carrinho: quantidades, remoção e total recalculado pela API (RF07 / CA01.3). */
export async function telaCarrinho(el, _params, atualizarMenu) {
  let totalRemovidos = 0;
  async function render() {
    const { cotacao: c, removidos } = await cotarCarrinho(api);
    totalRemovidos += removidos;
    atualizarMenu();
    if (!c) {
      el.innerHTML = `<h1>Meu carrinho</h1>${avisoRemovidos(totalRemovidos)}<p>Seu carrinho está vazio.</p><a class="btn" href="#/">Ver catálogo</a>`;
      return;
    }
    el.innerHTML = `
      <h1>Meu carrinho</h1>${avisoRemovidos(totalRemovidos)}
      ${c.itens.map((i) => `
        <div class="item" data-teste="item">
          ${foto(i.fotoUrl, i.produto)}
          <div class="d"><b>${esc(i.produto)}</b>Tam. ${esc(i.tamanho)} · ${esc(i.cor)}<br>${reais(i.precoUnitario)}
            ${i.quantidade > i.disponivel ? `<div class="aviso">Só ${i.disponivel} disponível(is)</div>` : ''}</div>
          <div class="qtd">
            <button data-menos="${i.variacaoId}" ${i.quantidade <= 1 ? 'disabled' : ''}>−</button>
            <span>${i.quantidade}</span>
            <button data-mais="${i.variacaoId}" ${i.quantidade >= i.disponivel ? 'disabled' : ''} title="${i.quantidade >= i.disponivel ? 'Limite do estoque' : ''}">+</button>
          </div>
          <div class="sub">${reais(i.subtotal)}</div>
          <button class="remover" data-remover="${i.variacaoId}">Remover</button>
        </div>`).join('')}
      <div class="total"><span>Total</span><span>${reais(c.total)}</span></div>
      <div class="nota">Frete e pagamento não são tratados pelo sistema.</div>
      <div class="acoes"><a class="btn o" href="#/">Continuar comprando</a><button class="btn" id="finalizar">Finalizar compra</button></div>`;
    const qtd = (id) => carrinho.itens().find((i) => i.variacaoId === id).quantidade;
    el.querySelectorAll('[data-mais]').forEach((b) => (b.onclick = () => { const id = +b.dataset.mais; carrinho.definir(id, qtd(id) + 1); render(); }));
    el.querySelectorAll('[data-menos]').forEach((b) => (b.onclick = () => { const id = +b.dataset.menos; carrinho.definir(id, qtd(id) - 1); render(); }));
    el.querySelectorAll('[data-remover]').forEach((b) => (b.onclick = () => { carrinho.remover(+b.dataset.remover); render(); }));
    el.querySelector('#finalizar').onclick = () => ir(sessao.tem('CLIENTE') ? '/resumo' : '/login?voltar=resumo');
  }
  await render();
}
