import { api, reais } from '../api.js';
import { esc } from '../util.js';

/** Tela 6 — Compra realizada (CA02.3). */
export async function pedido(el, params) {
  const p = await api(`/pedidos/${params.get('numero')}`);
  const data = new Date(p.criadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
  el.innerHTML = `
    <div class="sucesso">
      <div class="check">✓</div>
      <h1>Compra realizada!</h1>
      <div>Pedido <b>nº ${p.numero}</b> · ${data}</div>
    </div>
    <div class="tabela-rolagem"><table>
      <tr><th>Peça</th><th>Variação</th><th class="num">Qtd.</th><th class="num">Subtotal</th></tr>
      ${p.itens.map((i) => `<tr><td>${esc(i.produto)}</td><td>${esc(i.tamanho)} · ${esc(i.cor)}</td>
        <td class="num">${i.quantidade}</td><td class="num">${reais(i.subtotal)}</td></tr>`).join('')}
    </table></div>
    <div class="total"><span>Total</span><span>${reais(p.total)}</span></div>
    <p class="centro"><a class="btn" href="#/">Voltar ao catálogo</a></p>`;
}
