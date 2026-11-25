import { carrinho } from './carrinho.js';
import { sessao } from './sessao.js';
import { esc, ir } from './util.js';
import { catalogo } from './views/catalogo.js';
import { peca } from './views/peca.js';
import { telaCarrinho } from './views/carrinho.js';
import { login } from './views/login.js';
import { resumo } from './views/resumo.js';
import { pedido } from './views/pedido.js';
import { adminPecas, editarPeca, novaPeca } from './views/admin-pecas.js';
import { relatorio } from './views/relatorio.js';

/** Rotas da aplicação (hash routing): cada rota aponta para a função que desenha a tela. */
const rotas = [
  [/^\/$/, catalogo],
  [/^\/peca\/(?<id>\d+)$/, peca],
  [/^\/carrinho$/, telaCarrinho],
  [/^\/login$/, login],
  [/^\/resumo$/, resumo],
  [/^\/pedido\/(?<numero>\d+)$/, pedido],
  [/^\/admin\/pecas$/, adminPecas],
  [/^\/admin\/nova-peca$/, novaPeca],
  [/^\/admin\/peca\/(?<id>\d+)$/, editarPeca],
  [/^\/relatorio$/, relatorio],
];

function atualizarMenu() {
  const u = sessao.usuario;
  const rota = location.hash.slice(1) || '/';
  const a = (href, txt) => `<a href="#${href}" class="${rota.split('?')[0] === href ? 'ativo' : ''}">${txt}</a>`;
  const itens = [a('/', 'Catálogo')];
  if (!u || u.perfil === 'CLIENTE') itens.push(a('/carrinho', `Carrinho (${carrinho.quantidadeTotal()})`));
  if (u && u.perfil !== 'CLIENTE') {
    const link = a('/admin/pecas', 'Peças e estoque');
    // Mantém "Peças e estoque" destacado também no cadastro e na edição de uma peça.
    itens.push(/^\/admin\/(nova-peca|peca\/\d+)$/.test(rota) ? link.replace('class=""', 'class="ativo"') : link);
  }
  if (u?.perfil === 'DONO') itens.push(a('/relatorio', 'Estatísticas'));
  itens.push(u ? `<span>Olá, ${esc(u.nome.split(' ')[0])}</span><button class="sair" id="sair">Sair</button>` : a('/login', 'Entrar'));
  const menu = document.getElementById('menu');
  menu.innerHTML = itens.join('');
  const sair = document.getElementById('sair');
  if (sair) sair.onclick = () => { sessao.sair(); atualizarMenu(); ir('/'); };
}

async function navegar() {
  const [caminho, query = ''] = (location.hash.slice(1) || '/').split('?');
  const el = document.getElementById('app');
  const params = new URLSearchParams(query);
  atualizarMenu();
  for (const [re, tela] of rotas) {
    const m = caminho.match(re);
    if (!m) continue;
    Object.entries(m.groups ?? {}).forEach(([k, v]) => params.set(k, v));
    try {
      await tela(el, params, atualizarMenu);
    } catch (err) {
      el.innerHTML = `<div class="alerta">${esc(err.message)}</div>`;
    }
    window.scrollTo(0, 0);
    return;
  }
  el.innerHTML = '<p>Página não encontrada. <a href="#/">Ir ao catálogo</a></p>';
}

window.addEventListener('hashchange', navegar);
navegar();
