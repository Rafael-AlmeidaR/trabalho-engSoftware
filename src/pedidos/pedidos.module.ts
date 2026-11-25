import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';

@Module({ imports: [EstoqueModule], controllers: [PedidosController], providers: [PedidosService] })
export class PedidosModule {}
