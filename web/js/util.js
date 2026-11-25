export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ir = (rota) => { location.hash = rota; };

/**
 * Foto de uma peça. Se não houver imagem (ou o arquivo falhar), mostra o nome da peça
 * em letras grandes no lugar, em vez de um ícone de imagem quebrada.
 */
export function foto(url, nome, selo = '') {
  const s = selo ? `<span class="selo">${esc(selo)}</span>` : '';
  const img = url
    ? `<img src="${esc(url)}" alt="${esc(nome)}" loading="lazy" onerror="this.parentNode.classList.add('sem-img');this.remove()">`
    : '';
  return `<div class="foto${url ? '' : ' sem-img'}">${s}${img}<span class="foto-nome">${esc(nome)}</span></div>`;
}

/** Mensagem de erro logo abaixo de um campo (vazio quando não há erro). */
export const erroCampo = (msg) => (msg ? `<div class="erro-campo">${esc(msg)}</div>` : '');

/** Converte o texto digitado num número ("79,90" ou "79.90"); NaN se não for número. */
export function numero(texto) {
  const t = String(texto ?? '').trim().replace(/\s/g, '');
  if (t === '') return NaN;
  // "1.234,56" → "1234.56"; "79,9" → "79.9"
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^-?\d+(\.\d+)?$/.test(normal) ? Number(normal) : NaN;
}

/** Lista de mensagens vindas da API (400 do ValidationPipe vem como array). */
export const mensagensDaApi = (err) => (Array.isArray(err.dados?.message) ? err.dados.message : [err.message]);
