import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { UsuarioAtual, UsuarioToken } from '../auth/usuario-atual.decorator';
import { Perfil } from '../generated/prisma/enums';
import { ItensCarrinhoDto } from '../carrinho/dto/itens.dto';
import { PedidosService } from './pedidos.service';

@Controller('pedidos')
@UseGuards(JwtAuthGuard, PerfisGuard)
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Post()
  @Perfis(Perfil.CLIENTE)
  finalizar(@UsuarioAtual() u: UsuarioToken, @Body() dto: ItensCarrinhoDto) {
    return this.pedidos.finalizar(u.id, dto.itens);
  }

  @Get('meus')
  @Perfis(Perfil.CLIENTE)
  meus(@UsuarioAtual() u: UsuarioToken) {
    return this.pedidos.meus(u.id);
  }

  @Get(':numero')
  buscar(@Param('numero', ParseIntPipe) numero: number, @UsuarioAtual() u: UsuarioToken) {
    return this.pedidos.buscar(numero, u);
  }
}
