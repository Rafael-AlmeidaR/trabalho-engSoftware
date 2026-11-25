import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { CarrinhoController } from './carrinho.controller';
import { CarrinhoService } from './carrinho.service';

@Module({
  imports: [EstoqueModule],
  controllers: [CarrinhoController],
  providers: [CarrinhoService],
  exports: [CarrinhoService],
})
export class CarrinhoModule {}
