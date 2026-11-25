import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PerfisGuard } from '../auth/perfis.guard';
import { Perfis } from '../auth/perfis.decorator';
import { Perfil } from '../generated/prisma/enums';
import { RelatoriosService } from './relatorios.service';

class PeriodoDto {
  @Type(() => Number)
  @IsInt({ message: 'Informe o ano com 4 dígitos' })
  @Min(2000, { message: 'O ano deve estar entre 2000 e 2100' })
  @Max(2100, { message: 'O ano deve estar entre 2000 e 2100' })
  ano!: number;

  @Type(() => Number)
  @IsInt({ message: 'Informe o mês (1 a 12)' })
  @Min(1, { message: 'O mês deve estar entre 1 e 12' })
  @Max(12, { message: 'O mês deve estar entre 1 e 12' })
  mes!: number;
}

@Controller('relatorios')
@UseGuards(JwtAuthGuard, PerfisGuard)
@Perfis(Perfil.DONO)
export class RelatoriosController {
  constructor(private readonly relatorios: RelatoriosService) {}

  @Get('vendas-mensais')
  vendasMensais(@Query() p: PeriodoDto) {
    return this.relatorios.vendasMensais(p.ano, p.mes);
  }
}
