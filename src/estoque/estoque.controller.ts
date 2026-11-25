import { Body, Controller, Param, ParseIntPipe, Patch, UseGuards } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { ESTOQUE_MAXIMO } from '../produtos/dto/produto.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { EstoqueService } from './estoque.service';

class AjusteEstoqueDto {
  @IsInt({ message: 'O estoque deve ser um número inteiro' })
  @Min(0, { message: 'O estoque não pode ser negativo' })
  @Max(ESTOQUE_MAXIMO, { message: `O estoque máximo por variação é ${ESTOQUE_MAXIMO}` })
  estoque!: number;
}

/** Ajuste manual do estoque de uma variação pelo vendedor/dono. */
@Controller('variacoes')
@UseGuards(JwtAuthGuard, PerfisGuard)
@Perfis(Perfil.VENDEDOR, Perfil.DONO)
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  @Patch(':id/estoque')
  ajustar(@Param('id', ParseIntPipe) id: number, @Body() dto: AjusteEstoqueDto) {
    return this.estoque.ajustar(id, dto.estoque);
  }
}
