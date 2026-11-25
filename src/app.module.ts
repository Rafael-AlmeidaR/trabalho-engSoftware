import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { CarrinhoModule } from './carrinho/carrinho.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { RelatoriosModule } from './relatorios/relatorios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'web'),
      exclude: ['/api/{*rota}'],
    }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    ProdutosModule,
    EstoqueModule,
    CarrinhoModule,
    PedidosModule,
    RelatoriosModule,
  ],
})
export class AppModule {}
