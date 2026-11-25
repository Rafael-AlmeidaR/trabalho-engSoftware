import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { ClientesController } from './clientes.controller';
import { FuncionariosController } from './funcionarios.controller';

@Module({
  controllers: [ClientesController, FuncionariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
