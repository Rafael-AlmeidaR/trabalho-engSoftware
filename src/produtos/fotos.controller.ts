import { Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { ArquivoEnviado, FotosService, TAMANHO_MAXIMO_FOTO } from './fotos.service';

/** Envio da foto de uma peça (campo "foto" em multipart/form-data). Devolve { url }. */
@Controller('produtos/fotos')
@UseGuards(JwtAuthGuard, PerfisGuard)
@Perfis(Perfil.VENDEDOR, Perfil.DONO)
export class FotosController {
  constructor(private readonly fotos: FotosService) {}

  @Post()
  @HttpCode(201)
  // Os guards rodam antes: quem não está logado não chega a enviar o arquivo.
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: TAMANHO_MAXIMO_FOTO, files: 1 } }))
  enviar(@UploadedFile() arquivo?: ArquivoEnviado) {
    return this.fotos.salvar(arquivo);
  }
}
