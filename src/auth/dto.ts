import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizarEmail } from '../common/transforms';
import { CriarUsuarioDto } from '../usuarios/dto/usuario.dto';

export class LoginDto {
  @NormalizarEmail()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email!: string;

  @IsString({ message: 'Informe a senha' })
  @IsNotEmpty({ message: 'Informe a senha' })
  @MaxLength(72, { message: 'E-mail ou senha inválidos' })
  senha!: string;
}

/** Cadastro do próprio cliente: mesmas regras do cadastro feito pela loja. */
export class RegistroDto extends CriarUsuarioDto {}
