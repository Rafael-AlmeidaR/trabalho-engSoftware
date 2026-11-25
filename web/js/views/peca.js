import { api, reais } from '../api.js';
import { carrinho } from '../carrinho.js';
import { esc, foto } from '../util.js';

/** Tela 2 — Detalhe da peça: escolha de tamanho e cor e adição ao carrinho (HU01). */
export async function peca(el, params, atualizarMenu) {
  const p = await api(`/produtos/${params.get('id')}`);
  const tamanhos = [...new Set(p.variacoes.map((v) => v.tamanho))];
  const cores = [...new Set(p.variacoes.map((v) => v.cor))];
  let tam = null, cor = null;

  const variacao = () => p.variacoes.find((v) => v.tamanho === tam && v.cor === cor);
  const tamEsgotado = (t) => p.variacoes.filter((v) => v.tamanho === t).every((v) => v.esgotado);
  const corEsgotada = (c) => (tam ? p.variacoes.filter((v) => v.tamanho === tam && v.cor === c) : p.variacoes.filter((v) => v.cor === c)).every((v) => v.esgotado);

  function render(msg = '') {
    const v = variacao();
    const noCarrinho = v ? (carrinho.itens().find((i) => i.variacaoId === v.id)?.quantidade ?? 0) : 0;
    el.innerHTML = `
      <a class="voltar" href="#/">← Catálogo</a>
      <div class="detalhe">
        ${foto(p.fotoUrl, p.nome, p.esgotado ? 'Esgotado' : '')}
        <div class="detalhe-info">
          <h1>${esc(p.nome)}</h1>
          <div class="preco-g">${reais(p.preco)}</div>
          ${p.descricao ? `<p class="descricao">${esc(p.descricao)}</p>` : ''}
          <div class="lbl">Tamanho</div>
          <div class="chips">${tamanhos.map((t) => `<button class="chip ${t === tam ? 'on' : ''}" data-tam="${esc(t)}" ${tamEsgotado(t) ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>
          <div class="lbl">Cor</div>
          <div class="chips">${cores.map((c) => `<button class="chip ${c === cor ? 'on' : ''}" data-cor="${esc(c)}" ${corEsgotada(c) ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>
          ${v ? `<p class="estoque-info">${v.esgotado ? 'Esgotado nesta combinação' : `Estoque: ${v.estoque} unidade(s)`}</p>` : ''}
          ${msg}
          <button class="btn" id="add" ${p.esgotado ? 'disabled' : ''}>${p.esgotado ? 'Esgotado' : 'Adicionar ao carrinho'}</button>
          ${noCarrinho ? `<p class="estoque-info">Você tem ${noCarrinho} no carrinho. <a href="#/carrinho">Ver carrinho</a></p>` : ''}
        </div>
      </div>`;
    el.querySelectorAll('[data-tam]').forEach((b) => (b.onclick = () => { tam = b.dataset.tam; if (variacao()?.esgotado) cor = null; render(); }));
    el.querySelectorAll('[data-cor]').forEach((b) => (b.onclick = () => { cor = b.dataset.cor; render(); }));
    el.querySelector('#add').onclick = () => {
      const v = variacao();
      if (!tam || !cor) return render('<div class="alerta">Selecione o tamanho e a cor</div>'); // CA01.1
      if (!v || v.esgotado) return render('<div class="alerta">Essa combinação de tamanho e cor está esgotada</div>');
      const atual = carrinho.itens().find((i) => i.variacaoId === v.id)?.quantidade ?? 0;
      if (atual + 1 > v.estoque) return render(`<div class="alerta">Só há ${v.estoque} unidade(s) disponível(is) e você já tem ${atual} no carrinho</div>`);
      carrinho.adicionar(v.id); // CA01.2
      atualizarMenu();
      render(`<div class="ok-msg">Peça adicionada ao carrinho.</div>`);
    };
  }
  render();
}
