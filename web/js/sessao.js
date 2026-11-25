/** Guarda o token JWT e o usuário logado no navegador. */
const CHAVE = 'plantas.sessao';

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) ?? {}; } catch { return {}; }
}

export const sessao = {
  get token() { return ler().token; },
  get usuario() { return ler().usuario; },
  entrar({ token, usuario }) { localStorage.setItem(CHAVE, JSON.stringify({ token, usuario })); },
  sair() { localStorage.removeItem(CHAVE); },
  tem(...perfis) { return !!this.usuario && perfis.includes(this.usuario.perfil); },
};
