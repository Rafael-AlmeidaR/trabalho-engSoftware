import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CarrinhoService } from './carrinho.service';
import { ItensCarrinhoDto } from './dto/itens.dto';

@Controller('carrinho')
export class CarrinhoController {
  constructor(private readonly carrinho: CarrinhoService) {}

  /** Recalcula o carrinho: preços atuais, total e itens sem estoque. */
  @Post('cotacao')
  @HttpCode(200)
  cotar(@Body() dto: ItensCarrinhoDto) {
    return this.carrinho.cotar(dto.itens);
  }
}
