import { api, reais } from '../api.js';
import { carrinho, cotarCarrinho } from '../carrinho.js';
import { sessao } from '../sessao.js';
import { esc, ir } from '../util.js';

/** Tela 5 — Resumo do pedido: verificação de estoque e confirmação (HU02 / CA02.2). */
export async function resumo(el, _params, atualizarMenu) {
  if (!sessao.tem('CLIENTE')) return ir('/login?voltar=resumo');
  const [{ cotacao: c, removidos }, perfil] = await Promise.all([cotarCarrinho(api), api('/auth/me')]);
  // Peças que saíram do catálogo já foram tiradas do carrinho por cotarCarrinho; o aviso aparece no render.
  if (!c) { atualizarMenu(); return ir('/carrinho'); }
  if (removidos) atualizarMenu();
  const itens = carrinho.itens();

  function render(alerta = '') {
    const bloqueado = c.indisponiveis.map((i) => i.variacaoId);
    el.innerHTML = `
      <h1>Resumo do pedido</h1>
      ${c.indisponiveis.length ? `<div class="alerta"><b>Estoque insuficiente:</b> ${c.indisponiveis.map((i) =>
        `${esc(i.produto)} (${esc(i.tamanho)} · ${esc(i.cor)}) — disponível: ${i.disponivel}`).join('; ')}.
        <a href="#/carrinho">Ajustar carrinho</a></div>` : ''}
      ${alerta}
      <div class="tabela-rolagem"><table>
        <tr><th>Peça</th><th>Variação</th><th class="num">Qtd.</th><th class="num">Preço</th><th class="num">Subtotal</th></tr>
        ${c.itens.map((i) => `<tr class="${bloqueado.includes(i.variacaoId) ? 'riscado' : ''}">
          <td>${esc(i.produto)}</td><td>${esc(i.tamanho)} · ${esc(i.cor)}</td><td class="num">${i.quantidade}</td>
          <td class="num">${reais(i.precoUnitario)}</td><td class="num">${reais(i.subtotal)}</td></tr>`).join('')}
      </table></div>
      <p><b>Cliente:</b> ${esc(perfil.nome)} · ${esc(perfil.email)}</p>
      <div class="total"><span>Total</span><span>${reais(c.total)}</span></div>
      <div class="acoes"><a class="btn o" href="#/carrinho">Voltar ao carrinho</a>
        <button class="btn" id="confirmar" ${c.podeFinalizar ? '' : 'disabled'}>Confirmar compra</button></div>`;
    el.querySelector('#confirmar').onclick = async (e) => {
      e.target.disabled = true;
      try {
        const pedido = await api('/pedidos', { metodo: 'POST', corpo: { itens } });
        carrinho.limpar(); // CA02.3
        atualizarMenu();
        ir(`/pedido/${pedido.numero}`);
      } catch (err) {
        if (err.status === 409) { // alguém comprou antes: mostra o que faltou
          c.indisponiveis = err.dados.itens; c.podeFinalizar = false; render();
        } else render(`<div class="alerta">${esc(err.message)}</div>`);
      }
    };
  }
  render(removidos ? `<div class="alerta">${removidos === 1 ? "Uma peça saiu do catálogo e foi removida" : `${removidos} peças saíram do catálogo e foram removidas`} do seu carrinho.</div>` : "");
}
