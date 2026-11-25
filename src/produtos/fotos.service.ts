import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';

/** Pasta pública do site (a mesma servida pelo ServeStaticModule) e subpasta das fotos de peças. */
const PASTA_WEB = join(__dirname, '..', '..', 'web');
const PREFIXO_URL = '/img/produtos/';
const PASTA_FOTOS = join(PASTA_WEB, 'img', 'produtos');

export const TAMANHO_MAXIMO_FOTO = 8 * 1024 * 1024;

/** Só aceita fotos que estão na própria loja (evita apontar para sites externos). */
export const URL_FOTO_VALIDA = /^\/img\/[A-Za-z0-9_\-/]+\.(jpe?g|png|webp|svg)$/;

export interface ArquivoEnviado {
  buffer: Buffer;
  size: number;
}

/** Descobre o tipo pelo conteúdo do arquivo (assinatura), não pelo nome ou pelo que o navegador diz. */
function extensao(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

@Injectable()
export class FotosService {
  private readonly log = new Logger(FotosService.name);

  /** Grava a foto em web/img/produtos com um nome aleatório e devolve o endereço público. */
  async salvar(arquivo?: ArquivoEnviado) {
    if (!arquivo?.buffer?.length) throw new BadRequestException(['Escolha uma imagem para enviar']);
    if (arquivo.size > TAMANHO_MAXIMO_FOTO) throw new BadRequestException(['A imagem deve ter no máximo 8 MB']);
    const ext = extensao(arquivo.buffer);
    if (!ext) throw new BadRequestException(['Formato não aceito. Envie uma imagem JPG, PNG ou WebP']);
    await mkdir(PASTA_FOTOS, { recursive: true });
    const nome = `${randomUUID()}.${ext}`;
    await writeFile(join(PASTA_FOTOS, nome), arquivo.buffer);
    return { url: PREFIXO_URL + nome };
  }

  /** Apaga uma foto enviada pela loja que deixou de ser usada. Nunca apaga outras imagens do site. */
  async apagar(url: string | null | undefined) {
    if (!url?.startsWith(PREFIXO_URL)) return;
    const nome = url.slice(PREFIXO_URL.length);
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nome)) return;
    await unlink(join(PASTA_FOTOS, nome)).catch((e) => this.log.warn(`Não apagou ${nome}: ${e.message}`));
  }
}
