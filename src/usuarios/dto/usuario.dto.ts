import {
  IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength,
} from 'class-validator';
import { Perfil } from '../../generated/prisma/enums';
import { Aparar, ApararOpcional, NormalizarEmail } from '../../common/transforms';

/** Telefone com DDD: 10 ou 11 dígitos, aceitando espaços, parênteses, hífen e +55. */
export const TELEFONE = /^(\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}$/;
const MSG_TELEFONE = 'Informe um telefone válido com DDD, ex.: (53) 99999-9999';
/** Senha precisa ter algum caractere que não seja espaço. */
const SENHA_NAO_VAZIA = /\S/;

export class CriarUsuarioDto {
  @Aparar()
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'Informe o nome' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  nome!: string;

  @NormalizarEmail()
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres' })
  email!: string;

  @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' })
  @Matches(SENHA_NAO_VAZIA, { message: 'A senha não pode ser só espaços' })
  senha!: string;

  @ApararOpcional()
  @IsOptional() @IsString()
  @Matches(TELEFONE, { message: MSG_TELEFONE })
  telefone?: string;

  @ApararOpcional()
  @IsOptional() @IsString()
  @MaxLength(200, { message: 'O endereço deve ter no máximo 200 caracteres' })
  endereco?: string;
}

export class CriarFuncionarioDto extends CriarUsuarioDto {
  @IsEnum([Perfil.VENDEDOR, Perfil.DONO], { message: 'Perfil deve ser VENDEDOR ou DONO' })
  perfil!: Perfil;
}

export class AtualizarUsuarioDto {
  @Aparar()
  @IsOptional() @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome não pode ficar vazio' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  nome?: string;

  @NormalizarEmail()
  @IsOptional() @IsEmail({}, { message: 'Informe um e-mail válido' })
  @MaxLength(254, { message: 'O e-mail deve ter no máximo 254 caracteres' })
  email?: string;

  @IsOptional() @IsString({ message: 'A senha deve ser um texto' })
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' })
  @Matches(SENHA_NAO_VAZIA, { message: 'A senha não pode ser só espaços' })
  senha?: string;

  @ApararOpcional()
  @IsOptional() @IsString()
  @Matches(TELEFONE, { message: MSG_TELEFONE })
  telefone?: string;

  @Aparar()
  @IsOptional() @IsString()
  @MaxLength(200, { message: 'O endereço deve ter no máximo 200 caracteres' })
  endereco?: string;

  /** Só faz sentido para funcionários; a rota de clientes ignora este campo. */
  @IsOptional() @IsEnum([Perfil.VENDEDOR, Perfil.DONO], { message: 'Perfil deve ser VENDEDOR ou DONO' })
  perfil?: Perfil;
}
