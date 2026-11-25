import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { UsuariosService } from './usuarios.service';
import { AtualizarUsuarioDto, CriarUsuarioDto } from './dto/usuario.dto';

const CLIENTE = [Perfil.CLIENTE];

/** CRUD de clientes para a área administrativa (RF02). */
@Controller('clientes')
@UseGuards(JwtAuthGuard, PerfisGuard)
@Perfis(Perfil.VENDEDOR, Perfil.DONO)
export class ClientesController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post() criar(@Body() dto: CriarUsuarioDto) {
    return this.usuarios.criar({ ...dto, perfil: Perfil.CLIENTE });
  }

  @Get() listar() {
    return this.usuarios.listar(CLIENTE);
  }

  @Get(':id') buscar(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.buscar(id, CLIENTE);
  }

  @Patch(':id') atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUsuarioDto) {
    return this.usuarios.atualizar(id, CLIENTE, { ...dto, perfil: undefined });
  }

  @Delete(':id') @HttpCode(204)
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.excluir(id, CLIENTE);
  }
}
