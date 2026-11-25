import { api, reais } from '../api.js';
import { sessao } from '../sessao.js';
import { esc, ir, mensagensDaApi } from '../util.js';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ANO_MIN = 2000, ANO_MAX = 2100;

/** Estatísticas mensais de vendas, exclusivas do dono (RF09 / HU04). */
export async function relatorio(el, params) {
  if (!sessao.tem('DONO')) { el.innerHTML = '<div class="alerta">Acesso negado para o seu perfil.</div>'; return; }
  const hoje = new Date();
  const anoTxt = params.get('ano') ?? String(hoje.getFullYear());
  const mesTxt = params.get('mes') ?? String(hoje.getMonth() + 1);
  const ano = /^\d{4}$/.test(anoTxt) ? +anoTxt : NaN;
  const mes = /^\d{1,2}$/.test(mesTxt) ? +mesTxt : NaN;

  // Período inválido (digitado ou vindo da URL): avisa sem sumir com o formulário.
  let erro = '';
  if (!(mes >= 1 && mes <= 12)) erro = 'Mês inválido. Escolha um mês da lista.';
  else if (!(ano >= ANO_MIN && ano <= ANO_MAX)) erro = `Ano inválido. Informe um ano entre ${ANO_MIN} e ${ANO_MAX}.`;

  let r = null;
  if (!erro) {
    try { r = await api(`/relatorios/vendas-mensais?ano=${ano}&mes=${mes}`); } catch (err) { erro = mensagensDaApi(err).join('. '); }
  }
  const mesSel = mes >= 1 && mes <= 12 ? mes : hoje.getMonth() + 1;

  el.innerHTML = `
    <h1>Estatísticas de vendas</h1>
    <form id="f" class="filtro-periodo" novalidate>
      <select name="mes" aria-label="Mês">${MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 === mesSel ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <input name="ano" type="number" min="${ANO_MIN}" max="${ANO_MAX}" step="1" value="${esc(anoTxt)}" aria-label="Ano">
      <button class="btn">Ver</button>
    </form>
    <div id="msg">${erro ? `<div class="alerta">${esc(erro)}</div>` : ''}</div>
    ${r ? `
    ${r.mensagem ? `<div class="ok-msg">${esc(r.mensagem)}</div>` : ''}
    <div class="kpis">
      <div class="kpi"><div class="t">Total faturado em ${MESES[mes - 1]}/${ano}</div><div class="v">${reais(r.totalFaturado)}</div></div>
      <div class="kpi"><div class="t">Quantidade de vendas</div><div class="v">${r.quantidadeVendas}</div></div>
    </div>
    <h2>Peças mais vendidas</h2>
    ${r.maisVendidas.length ? `<table><tr><th>#</th><th>Peça</th><th class="num">Unidades</th><th class="num">Faturado</th></tr>
      ${r.maisVendidas.map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.produto)}</td><td class="num">${p.quantidade}</td><td class="num">${reais(p.faturado)}</td></tr>`).join('')}
    </table>` : '<p class="mudo">Sem vendas no período.</p>'}` : ''}`;

  el.querySelector('#f').onsubmit = (e) => {
    e.preventDefault();
    const d = new FormData(e.target);
    const a = String(d.get('ano')).trim();
    if (!/^\d{4}$/.test(a) || +a < ANO_MIN || +a > ANO_MAX) {
      el.querySelector('#msg').innerHTML = `<div class="alerta">Ano inválido. Informe um ano entre ${ANO_MIN} e ${ANO_MAX}.</div>`;
      return;
    }
    ir(`/relatorio?ano=${a}&mes=${d.get('mes')}`);
  };
}
