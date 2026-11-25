import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { ProdutosService } from './produtos.service';
import { AtualizarProdutoDto, CriarProdutoDto, EditarProdutoDto, FiltroCatalogoDto } from './dto/produto.dto';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtos: ProdutosService) {}

  @Get()
  catalogo(@Query() filtro: FiltroCatalogoDto) {
    return this.produtos.catalogo(filtro);
  }

  @Get('categorias')
  categorias() {
    return this.produtos.categorias();
  }

  @Get(':id')
  detalhe(@Param('id', ParseIntPipe) id: number) {
    return this.produtos.detalhe(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @Perfis(Perfil.VENDEDOR, Perfil.DONO)
  criar(@Body() dto: CriarProdutoDto) {
    return this.produtos.criar(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @Perfis(Perfil.VENDEDOR, Perfil.DONO)
  atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarProdutoDto) {
    return this.produtos.atualizar(id, dto);
  }

  /** Edição completa (dados + variações) usada pela tela de edição. */
  @Put(':id')
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @Perfis(Perfil.VENDEDOR, Perfil.DONO)
  editar(@Param('id', ParseIntPipe) id: number, @Body() dto: EditarProdutoDto) {
    return this.produtos.editar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, PerfisGuard)
  @Perfis(Perfil.VENDEDOR, Perfil.DONO)
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.produtos.excluir(id);
  }
}
