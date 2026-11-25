import { api, enviarArquivo, reais } from '../api.js';
import { sessao } from '../sessao.js';
import { erroCampo, esc, ir, mensagensDaApi, numero } from '../util.js';

/** Área do vendedor/dono: lista de peças com estoque e cadastro de nova peça (RF04, RF05, HU03). */
export async function adminPecas(el, _params, _menu, aviso = '') {
  if (!sessao.tem('VENDEDOR', 'DONO')) return ir('/login');
  const produtos = await api('/produtos');
  el.innerHTML = `
    <div class="secao-topo" style="margin-top:0">
      <h1>Peças e estoque</h1><a class="btn" href="#/admin/nova-peca">+ Nova peça</a></div>
    ${aviso}
    ${produtos.length ? '' : '<p class="mudo">Nenhuma peça cadastrada.</p>'}
    <div class="tabela-rolagem"><table>
      <tr><th>Peça</th><th>Categoria</th><th class="num">Preço</th><th>Variações (estoque)</th><th class="num">Total</th><th></th></tr>
      ${produtos.map((p) => `<tr><td><b>${esc(p.nome)}</b></td><td>${esc(p.categoria)}</td><td class="num">${reais(p.preco)}</td>
        <td>${p.variacoes.map((v) => `<span class="${v.esgotado ? 'esgotado-txt' : ''}">${esc(v.tamanho)}/${esc(v.cor)}: ${v.estoque}</span>`).join(' · ')}</td>
        <td class="num">${p.esgotado ? '<span class="esgotado-txt">Esgotado</span>' : p.estoqueTotal}</td>
        <td class="num" style="white-space:nowrap"><a href="#/admin/peca/${p.id}">Editar</a>
          <button type="button" class="remover" data-excluir="${p.id}" data-nome="${esc(p.nome)}" style="margin-left:10px">Excluir</button></td></tr>`).join('')}
    </table></div>`;

  el.querySelectorAll('[data-excluir]').forEach((b) => (b.onclick = async () => {
    if (!confirm(`Excluir a peça "${b.dataset.nome}"?

Ela sai do catálogo, mas os pedidos já feitos continuam registrados.`)) return;
    b.disabled = true;
    try {
      await api(`/produtos/${b.dataset.excluir}`, { metodo: 'DELETE' });
      await adminPecas(el, _params, _menu, `<div class="ok-msg">"${esc(b.dataset.nome)}" foi excluída do catálogo.</div>`);
    } catch (err) {
      b.disabled = false;
      await adminPecas(el, _params, _menu, `<div class="alerta">Não foi possível excluir: ${esc(err.message)}</div>`);
    }
  }));
}

// Limites iguais aos do back-end (src/produtos/dto/produto.dto.ts).
const LIMITE = { nome: 100, descricao: 1000, categoria: 50, tamanho: 10, cor: 40, preco: 100000, estoque: 100000, variacoes: 50 };

const variacaoVazia = () => ({ tamanho: '', cor: '', estoque: '' });
const linhaVazia = (v) => !v.tamanho.trim() && !v.cor.trim() && v.estoque.trim() === '';

/**
 * Valida o formulário no navegador, com as mesmas regras da API.
 * Devolve { campos: {nome: msg, ...}, variacoes: [{tamanho: msg, ...}], geral: [msg] }.
 */
/** Compara categorias ignorando maiúsculas, acentos e o "s" do plural ("Calça" = "calcas"). */
const chaveCategoria = (t) => t.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/s$/, "");

function validar(c, variacoes, categorias = []) {
  const campos = {};
  const erros = variacoes.map(() => ({}));
  const geral = [];

  if (!c.nome.trim()) campos.nome = 'Informe o nome da peça';
  else if (c.nome.trim().length > LIMITE.nome) campos.nome = `Máximo de ${LIMITE.nome} caracteres`;

  if (c.descricao.trim().length > LIMITE.descricao) campos.descricao = `Máximo de ${LIMITE.descricao} caracteres`;

  if (!c.categoria.trim()) campos.categoria = 'Informe a categoria';
  else if (c.categoria.trim().length > LIMITE.categoria) campos.categoria = `Máximo de ${LIMITE.categoria} caracteres`;
  else if (c.novaCategoria) {
    const igual = categorias.find((x) => chaveCategoria(x) === chaveCategoria(c.categoria));
    if (igual) campos.categoria = `Já existe a categoria "${igual}". Escolha ela na lista`;
  }

  const preco = numero(c.preco);
  if (c.preco.trim() === '') campos.preco = 'Informe o preço';
  else if (Number.isNaN(preco)) campos.preco = 'Preço inválido. Use só números, ex.: 79,90';
  else if (preco <= 0) campos.preco = 'O preço deve ser maior que zero';
  else if (preco > LIMITE.preco) campos.preco = 'O preço máximo é R$ 100.000,00';
  else if (Math.abs(preco * 100 - Math.round(preco * 100)) > 1e-6) campos.preco = 'Use no máximo 2 casas decimais (centavos)';

  const preenchidas = variacoes.filter((v) => !linhaVazia(v));
  if (!preenchidas.length) geral.push('Informe ao menos uma variação (tamanho, cor e estoque)');
  if (preenchidas.length > LIMITE.variacoes) geral.push(`Uma peça pode ter no máximo ${LIMITE.variacoes} variações`);

  const vistas = new Map();
  variacoes.forEach((v, i) => {
    if (linhaVazia(v)) return;
    const e = erros[i];
    const tam = v.tamanho.trim().toUpperCase();
    const cor = v.cor.trim();
    if (!tam) e.tamanho = 'Informe o tamanho';
    else if (tam.length > LIMITE.tamanho) e.tamanho = `Máx. ${LIMITE.tamanho} caracteres`;
    if (!cor) e.cor = 'Informe a cor';
    else if (cor.length > LIMITE.cor) e.cor = `Máx. ${LIMITE.cor} caracteres`;

    const est = v.estoque.trim();
    if (est === '') e.estoque = 'Informe o estoque (pode ser 0)';
    else if (!/^\d+$/.test(est)) e.estoque = 'Use um número inteiro, sem sinal';
    else if (Number(est) > LIMITE.estoque) e.estoque = `Máximo de ${LIMITE.estoque}`;

    if (tam && cor) {
      const chave = `${tam}|${cor.toLowerCase()}`;
      if (vistas.has(chave)) {
        e.cor = `Repete a linha ${vistas.get(chave) + 1} (${tam} / ${cor})`;
      } else vistas.set(chave, i);
    }
  });

  const temErro = Object.keys(campos).length || geral.length || erros.some((e) => Object.keys(e).length);
  return temErro ? { campos, variacoes: erros, geral } : null;
}

/**
 * Formulário de peça usado no cadastro e na edição.
 * Todo o estado fica em `campos` e `variacoes`: redesenhar a tela (ao adicionar/remover variação
 * ou ao mostrar erros) não apaga o que já foi digitado.
 * Variações com `id` já existem no banco: tamanho e cor ficam travados, só o estoque muda.
 */
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const LADO_MAXIMO_FOTO = 1600;

/**
 * Reduz a foto no navegador antes do envio (fotos de celular têm 3–10 MB): no máximo 1600 px
 * no lado maior, em JPEG. Respeita a rotação da câmera e pinta fundo branco em PNG transparente.
 */
async function reduzirFoto(arquivo) {
  const bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não foi possível ler a imagem'))), 'image/jpeg', 0.86));
}

function formularioPeca(el, { titulo, inicial, textoBotao, enviar, excluir, categorias }) {
  const campos = { ...inicial.campos, novaCategoria: false };
  const variacoes = inicial.variacoes.map((v) => ({ ...v }));
  let erros = null;
  let enviando = false;
  let enviandoFoto = false;
  let erroFoto = '';

  function render({ focar } = {}) {
    const ec = erros?.campos ?? {};
    const ev = erros?.variacoes ?? [];
    const inv = (msg) => (msg ? 'aria-invalid="true"' : '');
    const trava = (v) => (v.id ? 'readonly title="Tamanho e cor de uma variação já cadastrada não mudam. Para trocar, remova e crie outra."' : '');
    el.innerHTML = `
      <a class="voltar" href="#/admin/pecas">← Peças e estoque</a>
      <h1>${esc(titulo)}</h1>
      <form id="f" class="form form-largo" novalidate>
        <label for="nome">Nome *</label>
        <input id="nome" name="nome" maxlength="${LIMITE.nome}" value="${esc(campos.nome)}" ${inv(ec.nome)}>
        ${erroCampo(ec.nome)}
        <label>Foto <span class="dica">(JPG, PNG ou WebP — de preferência vertical)</span></label>
        <div class="campo-foto">
          <div class="campo-foto-previa">${campos.fotoUrl ? `<img src="${esc(campos.fotoUrl)}" alt="Foto da peça">` : '<span>Sem foto</span>'}
            ${enviandoFoto ? '<div class="campo-foto-carregando">Enviando…</div>' : ''}</div>
          <div class="campo-foto-acoes">
            <label class="btn o pq" for="arquivo-foto" ${enviandoFoto ? 'aria-disabled="true"' : ''}>${campos.fotoUrl ? 'Trocar foto' : 'Escolher foto'}</label>
            <input type="file" id="arquivo-foto" accept="image/jpeg,image/png,image/webp" hidden ${enviandoFoto ? 'disabled' : ''}>
            ${campos.fotoUrl && !enviandoFoto ? '<button type="button" class="remover" id="remover-foto">Remover foto</button>' : ''}
            ${erroCampo(erroFoto)}
          </div>
        </div>
        <label for="descricao">Descrição</label>
        <textarea id="descricao" name="descricao" rows="2" maxlength="${LIMITE.descricao}" ${inv(ec.descricao)}>${esc(campos.descricao)}</textarea>
        ${erroCampo(ec.descricao)}
        <div class="linha-form" style="align-items:start">
          <div><label for="cat-sel">Categoria *</label>
            <select id="cat-sel" ${!campos.novaCategoria ? inv(ec.categoria) : ""}>
              <option value="" ${!campos.categoria && !campos.novaCategoria ? "selected" : ""} disabled>Escolha…</option>
              ${categorias.map((c) => `<option value="${esc(c)}" ${!campos.novaCategoria && c === campos.categoria ? "selected" : ""}>${esc(c)}</option>`).join("")}
              <option value="__nova__" ${campos.novaCategoria ? "selected" : ""}>+ Nova categoria…</option>
            </select>
            ${campos.novaCategoria ? `<input id="categoria" name="categoria" placeholder="Nome da nova categoria" maxlength="${LIMITE.categoria}" value="${esc(campos.categoria)}" aria-label="Nome da nova categoria" style="margin-top:8px" ${inv(ec.categoria)}>` : ""}
            ${erroCampo(ec.categoria)}</div>
          <div><label for="preco">Preço (R$) *</label>
            <input id="preco" name="preco" inputmode="decimal" placeholder="79,90" value="${esc(campos.preco)}" ${inv(ec.preco)}>
            ${erroCampo(ec.preco)}</div>
        </div>
        <label>Variações * <span class="dica">(tamanho, cor e quantidade em estoque)</span></label>
        <div id="vars">${variacoes.map((v, i) => {
          const e = ev[i] ?? {};
          return `
          <div class="var-linha">
            <div><input data-i="${i}" data-c="tamanho" placeholder="Tamanho (ex.: M)" maxlength="${LIMITE.tamanho}" value="${esc(v.tamanho)}" aria-label="Tamanho da variação ${i + 1}" ${trava(v)} ${inv(e.tamanho)}>${erroCampo(e.tamanho)}</div>
            <div><input data-i="${i}" data-c="cor" placeholder="Cor" maxlength="${LIMITE.cor}" value="${esc(v.cor)}" aria-label="Cor da variação ${i + 1}" ${trava(v)} ${inv(e.cor)}>${erroCampo(e.cor)}</div>
            <div><input data-i="${i}" data-c="estoque" inputmode="numeric" placeholder="Estoque" value="${esc(v.estoque)}" aria-label="Estoque da variação ${i + 1}" ${inv(e.estoque)}>${erroCampo(e.estoque)}</div>
            <button type="button" class="remover" data-del="${i}" title="Remover variação" ${variacoes.length === 1 ? 'disabled' : ''}>✕</button>
          </div>`;
        }).join('')}</div>
        <button type="button" class="btn o pq" id="maisvar" ${variacoes.length >= LIMITE.variacoes ? 'disabled' : ''}>+ Variação</button>
        ${erros?.geral?.length ? `<div class="alerta"><ul class="erros">${erros.geral.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>` : ''}
        ${erros && !erros.geral?.length ? '<div class="alerta">Corrija os campos destacados.</div>' : ''}
        <div class="acoes">
          <span><button class="btn" id="salvar" ${enviando || enviandoFoto ? 'disabled' : ''}>${enviando ? 'Salvando…' : textoBotao}</button>
            <a href="#/admin/pecas" style="margin-left:12px">Cancelar</a></span>
          ${excluir ? `<button type="button" class="remover" id="excluir" ${enviando ? 'disabled' : ''}>Excluir peça</button>` : ''}
        </div>
      </form>`;

    const f = el.querySelector('#f');
    f.querySelectorAll('[name]').forEach((inp) => (inp.oninput = () => { campos[inp.name] = inp.value; }));
    el.querySelector("#cat-sel").onchange = (e) => {
      const nova = e.target.value === "__nova__";
      campos.novaCategoria = nova;
      campos.categoria = nova ? "" : e.target.value;
      if (erros?.campos) delete erros.campos.categoria;
      render({ focar: nova ? "#categoria" : null });
    };
    f.querySelectorAll('[data-c]').forEach((inp) => (inp.oninput = () => { variacoes[+inp.dataset.i][inp.dataset.c] = inp.value; }));
    f.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.del;
      variacoes.splice(i, 1);
      if (erros?.variacoes) erros.variacoes.splice(i, 1);
      render();
    }));
    el.querySelector('#maisvar').onclick = () => {
      variacoes.push(variacaoVazia());
      erros?.variacoes?.push({});
      render({ focar: `[data-i="${variacoes.length - 1}"][data-c="tamanho"]` });
    };
    f.onsubmit = salvar;
    el.querySelector('#arquivo-foto').onchange = (e) => trocarFoto(e.target.files[0]);
    const btnRemoverFoto = el.querySelector('#remover-foto');
    if (btnRemoverFoto) btnRemoverFoto.onclick = () => { campos.fotoUrl = null; erroFoto = ''; render(); };
    const btnExcluir = el.querySelector('#excluir');
    if (btnExcluir) btnExcluir.onclick = apagar;

    if (focar) el.querySelector(focar)?.focus();
  }

  const falhou = (err) => {
    enviando = false;
    erros = { campos: {}, variacoes: [], geral: err.status ? mensagensDaApi(err) : ['Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.'] }; // CA03.1
    render();
  };

  async function trocarFoto(arquivo) {
    if (!arquivo) return;
    erroFoto = '';
    if (!TIPOS_FOTO.includes(arquivo.type)) { erroFoto = 'Formato não aceito. Use JPG, PNG ou WebP'; return render(); }
    if (arquivo.size > 30 * 1024 * 1024) { erroFoto = 'Arquivo grande demais (máximo 30 MB antes da redução)'; return render(); }
    enviandoFoto = true;
    render();
    try {
      const reduzida = await reduzirFoto(arquivo);
      const { url } = await enviarArquivo('/produtos/fotos', 'foto', reduzida, 'foto.jpg');
      campos.fotoUrl = url;
    } catch (err) {
      erroFoto = err.status ? err.message : 'Não foi possível enviar a foto. Tente outra imagem.';
    }
    enviandoFoto = false;
    render();
  }

  async function salvar(e) {
    e.preventDefault();
    if (enviando || enviandoFoto) return;
    erros = validar(campos, variacoes, categorias);
    if (erros) {
      render();
      el.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const corpo = {
      nome: campos.nome.trim(),
      descricao: campos.descricao.trim() || undefined,
      categoria: campos.categoria.trim(),
      fotoUrl: campos.fotoUrl || null,
      preco: numero(campos.preco),
      variacoes: variacoes.filter((v) => !linhaVazia(v)).map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        tamanho: v.tamanho.trim().toUpperCase(), cor: v.cor.trim(), estoque: Number(v.estoque.trim()),
      })),
    };
    enviando = true;
    render();
    try {
      await enviar(corpo);
      ir('/admin/pecas');
    } catch (err) { falhou(err); }
  }

  async function apagar() {
    if (enviando) return;
    if (!confirm(`Excluir a peça "${campos.nome.trim() || inicial.campos.nome}"?\n\nEla sai do catálogo, mas os pedidos já feitos continuam registrados.`)) return;
    enviando = true;
    render();
    try {
      await excluir();
      ir('/admin/pecas');
    } catch (err) { falhou(err); }
  }

  render({ focar: '#nome' });
}

export async function novaPeca(el) {
  if (!sessao.tem('VENDEDOR', 'DONO')) return ir('/login');
  const categorias = await api('/produtos/categorias');
  formularioPeca(el, {
    categorias,
    titulo: 'Nova peça',
    textoBotao: 'Salvar peça',
    inicial: { campos: { nome: '', descricao: '', categoria: '', preco: '', fotoUrl: null }, variacoes: [variacaoVazia()] },
    enviar: (corpo) => api('/produtos', { metodo: 'POST', corpo }),
  });
}

export async function editarPeca(el, params) {
  if (!sessao.tem('VENDEDOR', 'DONO')) return ir('/login');
  const id = params.get('id');
  const [p, categorias] = await Promise.all([api(`/produtos/${id}`), api('/produtos/categorias')]);
  formularioPeca(el, {
    categorias,
    titulo: `Editar: ${p.nome}`,
    textoBotao: 'Salvar alterações',
    inicial: {
      campos: {
        nome: p.nome, descricao: p.descricao ?? '', categoria: p.categoria,
        preco: p.preco.toFixed(2).replace('.', ','),
        fotoUrl: p.fotoUrl,
      },
      variacoes: p.variacoes.map((v) => ({ id: v.id, tamanho: v.tamanho, cor: v.cor, estoque: String(v.estoque) })),
    },
    enviar: (corpo) => api(`/produtos/${id}`, { metodo: 'PUT', corpo }),
    excluir: () => api(`/produtos/${id}`, { metodo: 'DELETE' }),
  });
}
