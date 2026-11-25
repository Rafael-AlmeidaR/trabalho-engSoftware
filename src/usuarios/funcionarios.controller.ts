import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { UsuariosService } from './usuarios.service';
import { AtualizarUsuarioDto, CriarFuncionarioDto } from './dto/usuario.dto';

const FUNCIONARIO = [Perfil.VENDEDOR, Perfil.DONO];

/** CRUD de funcionários, exclusivo do dono (RF03 / HU05). */
@Controller('funcionarios')
@UseGuards(JwtAuthGuard, PerfisGuard)
@Perfis(Perfil.DONO)
export class FuncionariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Post() criar(@Body() dto: CriarFuncionarioDto) {
    return this.usuarios.criar(dto);
  }

  @Get() listar() {
    return this.usuarios.listar(FUNCIONARIO);
  }

  @Get(':id') buscar(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.buscar(id, FUNCIONARIO);
  }

  @Patch(':id') atualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: AtualizarUsuarioDto) {
    return this.usuarios.atualizar(id, FUNCIONARIO, dto);
  }

  @Delete(':id') @HttpCode(204)
  excluir(@Param('id', ParseIntPipe) id: number) {
    return this.usuarios.excluir(id, FUNCIONARIO);
  }
}
