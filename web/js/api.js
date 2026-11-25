import { sessao } from './sessao.js';

/** Chamada à API REST. Lança um erro com status e corpo quando a resposta não é 2xx. */
export async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (sessao.token) headers.Authorization = `Bearer ${sessao.token}`;
  const r = await fetch(`/api${caminho}`, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  const dados = r.status === 204 ? null : await r.json().catch(() => null);
  if (!r.ok) {
    const erro = new Error(Array.isArray(dados?.message) ? dados.message.join('; ') : dados?.message ?? 'Erro');
    erro.status = r.status; erro.dados = dados;
    if (r.status === 401 && sessao.token) sessao.sair();
    throw erro;
  }
  return dados;
}

/** Envia um arquivo (multipart/form-data) para a API. Mesmo tratamento de erro de api(). */
export async function enviarArquivo(caminho, campo, arquivo, nome) {
  const corpo = new FormData();
  corpo.append(campo, arquivo, nome);
  const headers = sessao.token ? { Authorization: `Bearer ${sessao.token}` } : {};
  const r = await fetch(`/api${caminho}`, { method: 'POST', headers, body: corpo });
  const dados = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = r.status === 413 ? 'A imagem é grande demais (máximo 8 MB)'
      : Array.isArray(dados?.message) ? dados.message.join('; ') : dados?.message ?? 'Erro ao enviar a imagem';
    const erro = new Error(msg);
    erro.status = r.status; erro.dados = dados;
    if (r.status === 401 && sessao.token) sessao.sair();
    throw erro;
  }
  return dados;
}

export const reais =(v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
