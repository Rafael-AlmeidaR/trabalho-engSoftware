import { Module } from '@nestjs/common';
import { FotosController } from './fotos.controller';
import { FotosService } from './fotos.service';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';

// FotosController vem antes para "POST /produtos/fotos" não ser confundido com outra rota de produtos.
@Module({
  controllers: [FotosController, ProdutosController],
  providers: [ProdutosService, FotosService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
