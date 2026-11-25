import { api, reais } from '../api.js';
import { esc, foto } from '../util.js';

/** Fotos do banner de abertura (versões otimizadas em web/img/banners/). Passam em sequência. */
const SLIDES = ['banner3', 'banner2', 'banner4'];
const TEMPO_SLIDE = 6000;
let timerSlides = null;

const imgBanner = (nome, alt = '', extra = '') => `<img src="/img/banners/${nome}.jpg"
  srcset="/img/banners/${nome}-m.jpg 1200w, /img/banners/${nome}.jpg 2400w" sizes="100vw" alt="${alt}" ${extra}>`;

/** Troca o slide ativo a cada TEMPO_SLIDE; para sozinho quando a tela muda. */
function iniciarSlides(el) {
  clearInterval(timerSlides);
  const slides = [...el.querySelectorAll('.hero-slide')];
  const pontos = [...el.querySelectorAll('.hero-pontos button')];
  let atual = 0;
  const mostrar = (i) => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, j) => s.classList.toggle('on', j === atual));
    pontos.forEach((p, j) => p.setAttribute('aria-current', j === atual ? 'true' : 'false'));
  };
  const reiniciar = () => {
    clearInterval(timerSlides);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    timerSlides = setInterval(() => {
      if (!slides[0].isConnected) return clearInterval(timerSlides);
      mostrar(atual + 1);
    }, TEMPO_SLIDE);
  };
  pontos.forEach((p, j) => (p.onclick = () => { mostrar(j); reiniciar(); }));
  // Ativa a 1ª foto só depois do primeiro quadro desenhado, para ela também entrar com o zoom out.
  requestAnimationFrame(() => requestAnimationFrame(() => mostrar(0)));
  if (slides.length > 1) reiniciar();
}

/** Tela 1 — Catálogo com filtros por categoria e tamanho (RF06). */
export async function catalogo(el, params) {
  clearInterval(timerSlides);
  const categoria = params.get('categoria') ?? '';
  const tamanho = params.get('tamanho') ?? '';
  const filtro = new URLSearchParams({ ...(categoria && { categoria }), ...(tamanho && { tamanho }) });
  const [produtos, categorias] = await Promise.all([api(`/produtos?${filtro}`), api('/produtos/categorias')]);
  const tamanhos = ['P', 'M', 'G', 'GG'];
  const link = (c, t) => `#/?${new URLSearchParams({ ...(c && { categoria: c }), ...(t && { tamanho: t }) })}`;
  const filtrando = categoria || tamanho;

  el.innerHTML = `
    ${filtrando ? '' : `
    <section class="hero">
      <div class="hero-slides" aria-hidden="true">
        ${SLIDES.map((s, i) => `<div class="hero-slide">${imgBanner(s, '', i === 0 ? 'fetchpriority="high"' : 'loading="lazy"')}</div>`).join('')}
      </div>
      <div class="hero-conteudo">
        <div class="hero-sobre">Nova coleção · 2026</div>
        <h2 class="hero-titulo">Planta's<br>Clothing</h2>
        <div class="hero-rodape">
          <a class="btn" href="#produtos">Ver a coleção</a>
          <div class="hero-pontos">${SLIDES.map((_, i) => `<button type="button" aria-label="Foto ${i + 1}" aria-current="${i === 0}"></button>`).join('')}</div>
        </div>
      </div>
    </section>`}
    <div class="secao-topo" id="produtos">
      <h1>${categoria ? esc(categoria) : 'Todas as peças'}</h1>
      <span class="contagem">${produtos.length} ${produtos.length === 1 ? 'peça' : 'peças'}</span>
    </div>
    <div class="filtros">
      <div class="chips">
        <a class="chip ${!categoria ? 'on' : ''}" href="${link('', tamanho)}">Todas</a>
        ${categorias.map((c) => `<a class="chip ${c === categoria ? 'on' : ''}" href="${link(c, tamanho)}">${esc(c)}</a>`).join('')}
      </div>
      <div class="chips" aria-label="Tamanho">
        ${tamanhos.map((t) => `<a class="chip ${t === tamanho ? 'on' : ''}" href="${link(categoria, t === tamanho ? '' : t)}">${t}</a>`).join('')}
      </div>
    </div>
    ${produtos.length ? '' : '<p class="mudo">Nenhuma peça encontrada com esses filtros. <a href="#/">Limpar filtros</a></p>'}
    <div class="grade">
      ${produtos.map((p) => `
        <a class="card ${p.esgotado ? 'esgotado' : ''}" href="#/peca/${p.id}" data-teste="card">
          ${foto(p.fotoUrl, p.nome, p.esgotado ? 'Esgotado' : '')}
          <div class="info">
            <div><div class="nome">${esc(p.nome)}</div><div class="cat">${esc(p.categoria)}</div></div>
            <div class="preco">${reais(p.preco)}</div>
          </div>
        </a>`).join('')}
    </div>
    ${filtrando ? '' : `
    <section class="editorial">
      ${imgBanner('banner1', '', 'loading="lazy"')}
      <div class="editorial-texto">
        <div class="hero-sobre">Planta's · Rio Grande, RS</div>
        <h2>Raízes<br>no Sul</h2>
        <p>Streetwear que nasce da rua e da natureza. Peças pensadas para durar, em edições pequenas.</p>
        <a class="btn" href="#produtos">Comprar agora</a>
      </div>
    </section>`}`;

  // Botões "Ver a coleção" e "Comprar agora" rolam até os produtos sem mexer na rota (o site usa #/ para navegar).
  el.querySelectorAll('a[href="#produtos"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    el.querySelector('#produtos').scrollIntoView({ behavior: 'smooth' });
  }));
  if (!filtrando) iniciarSlides(el);
}
