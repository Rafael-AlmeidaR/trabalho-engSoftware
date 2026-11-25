import { api } from '../api.js';
import { carrinho } from '../carrinho.js';
import { sessao } from '../sessao.js';
import { erroCampo, esc, ir, mensagensDaApi } from '../util.js';

// Mesmas regras da API (src/usuarios/dto/usuario.dto.ts).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONE = /^(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}$/;

function validar(modo, d) {
  const e = {};
  const email = d.email.trim();
  if (!email) e.email = 'Informe o e-mail';
  else if (!EMAIL.test(email) || email.length > 254) e.email = 'Informe um e-mail válido, ex.: nome@email.com';

  if (modo === 'login') {
    if (!d.senha) e.senha = 'Informe a senha';
    return e;
  }
  if (!d.nome.trim()) e.nome = 'Informe o nome';
  else if (d.nome.trim().length > 100) e.nome = 'Máximo de 100 caracteres';
  if (d.telefone.trim() && !TELEFONE.test(d.telefone.trim())) e.telefone = 'Telefone inválido. Use o DDD, ex.: (53) 99999-9999';
  if (d.endereco.trim().length > 200) e.endereco = 'Máximo de 200 caracteres';
  if (!d.senha) e.senha = 'Crie uma senha';
  else if (d.senha.length < 6) e.senha = 'A senha deve ter ao menos 6 caracteres';
  else if (d.senha.length > 72) e.senha = 'A senha deve ter no máximo 72 caracteres';
  else if (!d.senha.trim()) e.senha = 'A senha não pode ser só espaços';
  return e;
}

/** Tela 4 — Login (RF01) e criação de conta do cliente (RF02). O carrinho é preservado (CA02.1). */
export async function login(el, params, atualizarMenu) {
  const voltar = params.get('voltar');
  let modo = params.get('modo') === 'cadastro' ? 'cadastro' : 'login';
  // Guardado fora do HTML: trocar entre login/cadastro ou mostrar um erro não apaga o que foi digitado.
  const dados = { nome: '', telefone: '', endereco: '', email: '', senha: '' };
  let erros = {};
  let erroGeral = '';
  let enviando = false;

  function render() {
    const qtd = carrinho.quantidadeTotal();
    const inv = (k) => (erros[k] ? 'aria-invalid="true"' : '');
    el.innerHTML = `
      <div class="form">
        <h1 class="centro">${modo === 'login' ? (voltar ? 'Entre para finalizar sua compra' : 'Entrar') : 'Criar conta'}</h1>
        ${voltar && qtd ? `<p class="centro mudo">Seus ${qtd} item(ns) continuam no carrinho.</p>` : ''}
        <form id="f" novalidate>
          ${modo === 'cadastro' ? `
            <label for="nome">Nome *</label><input id="nome" name="nome" autocomplete="name" maxlength="100" value="${esc(dados.nome)}" ${inv('nome')}>${erroCampo(erros.nome)}
            <label for="telefone">Telefone</label><input id="telefone" name="telefone" type="tel" autocomplete="tel" placeholder="(53) 99999-9999" maxlength="20" value="${esc(dados.telefone)}" ${inv('telefone')}>${erroCampo(erros.telefone)}
            <label for="endereco">Endereço</label><input id="endereco" name="endereco" autocomplete="street-address" maxlength="200" value="${esc(dados.endereco)}" ${inv('endereco')}>${erroCampo(erros.endereco)}` : ''}
          <label for="email">E-mail *</label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" value="${esc(dados.email)}" ${inv('email')}>${erroCampo(erros.email)}
          <label for="senha">Senha *${modo === 'cadastro' ? ' <span class="dica">(mínimo 6 caracteres)</span>' : ''}</label>
          <input id="senha" name="senha" type="password" autocomplete="${modo === 'login' ? 'current-password' : 'new-password'}" maxlength="72" value="${esc(dados.senha)}" ${inv('senha')}>${erroCampo(erros.senha)}
          ${erroGeral ? `<div class="alerta">${esc(erroGeral)}</div>` : ''}
          <p><button class="btn lg" ${enviando ? 'disabled' : ''}>${enviando ? 'Aguarde…' : modo === 'login' ? 'Entrar' : 'Criar conta'}</button></p>
        </form>
        <p class="centro form-troca">${modo === 'login'
          ? 'Ainda não tem conta? <a href="#" id="troca">Criar conta</a>'
          : 'Já tem conta? <a href="#" id="troca">Entrar</a>'}</p>
      </div>`;
    el.querySelectorAll('[name]').forEach((inp) => (inp.oninput = () => { dados[inp.name] = inp.value; }));
    el.querySelector('#troca').onclick = (e) => {
      e.preventDefault();
      modo = modo === 'login' ? 'cadastro' : 'login';
      erros = {}; erroGeral = '';
      render();
    };
    el.querySelector('#f').onsubmit = enviar;
  }

  async function enviar(e) {
    e.preventDefault();
    if (enviando) return;
    erros = validar(modo, dados);
    erroGeral = '';
    if (Object.keys(erros).length) {
      render();
      el.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const corpo = modo === 'login'
      ? { email: dados.email.trim(), senha: dados.senha }
      : {
        nome: dados.nome.trim(), email: dados.email.trim(), senha: dados.senha,
        telefone: dados.telefone.trim() || undefined, endereco: dados.endereco.trim() || undefined,
      };
    enviando = true;
    render();
    try {
      const r = await api(modo === 'login' ? '/auth/login' : '/auth/registro', { metodo: 'POST', corpo });
      sessao.entrar(r);
      atualizarMenu();
      if (voltar === 'resumo' && r.usuario.perfil === 'CLIENTE') ir('/resumo');
      else ir(r.usuario.perfil === 'CLIENTE' ? '/' : '/admin/pecas');
    } catch (err) {
      enviando = false;
      if (modo === 'login') dados.senha = ''; // login recusado: a senha é digitada de novo
      erroGeral = err.status ? mensagensDaApi(err).join('. ') : 'Não foi possível falar com o servidor. Tente de novo.';
      render();
    }
  }

  render();
}
