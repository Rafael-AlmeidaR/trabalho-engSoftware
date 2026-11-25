import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max,
  Matches, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { URL_FOTO_VALIDA } from '../fotos.service';
import { Aparar, ApararOpcional } from '../../common/transforms';

export const PRECO_MAXIMO = 100000;
export const ESTOQUE_MAXIMO = 100000;

export class VariacaoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString({ message: 'O tamanho da variação deve ser um texto' })
  @IsNotEmpty({ message: 'Informe o tamanho da variação' })
  @MaxLength(10, { message: 'O tamanho deve ter no máximo 10 caracteres' })
  tamanho!: string;

  @Aparar()
  @IsString({ message: 'A cor da variação deve ser um texto' })
  @IsNotEmpty({ message: 'Informe a cor da variação' })
  @MaxLength(40, { message: 'A cor deve ter no máximo 40 caracteres' })
  cor!: string;

  @IsInt({ message: 'O estoque deve ser um número inteiro' })
  @Min(0, { message: 'O estoque não pode ser negativo' })
  @Max(ESTOQUE_MAXIMO, { message: `O estoque máximo por variação é ${ESTOQUE_MAXIMO}` })
  estoque!: number;
}

/** Campos comuns ao cadastro e à edição completa da peça. */
class DadosProdutoDto {
  @Aparar()
  @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'Informe o nome da peça' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  nome!: string;

  @ApararOpcional()
  @IsOptional() @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
  descricao?: string;

  @Aparar()
  @IsString({ message: 'A categoria deve ser um texto' })
  @IsNotEmpty({ message: 'Informe a categoria' })
  @MaxLength(50, { message: 'A categoria deve ter no máximo 50 caracteres' })
  categoria!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ter no máximo 2 casas decimais' })
  @IsPositive({ message: 'Informe um preço maior que zero' })
  @Max(PRECO_MAXIMO, { message: 'O preço máximo é R$ 100.000,00' })
  preco!: number;

  @ApararOpcional()
  @IsOptional() @IsString()
  @MaxLength(300, { message: 'O endereço da foto deve ter no máximo 300 caracteres' })
  @Matches(URL_FOTO_VALIDA, { message: 'Foto inválida. Envie a imagem pelo formulário da peça' })
  fotoUrl?: string | null;

}

export class CriarProdutoDto extends DadosProdutoDto {
  @IsArray({ message: 'Informe ao menos uma variação (tamanho, cor e estoque)' })
  @ArrayMinSize(1, { message: 'Informe ao menos uma variação (tamanho, cor e estoque)' })
  @ArrayMaxSize(50, { message: 'Uma peça pode ter no máximo 50 variações' })
  @ValidateNested({ each: true })
  @Type(() => VariacaoDto)
  variacoes!: VariacaoDto[];
}

/** Variação na edição: com id é uma existente (só o estoque muda); sem id é nova. */
export class EditarVariacaoDto extends VariacaoDto {
  @IsOptional()
  @IsInt({ message: 'Variação inválida' }) @Min(1, { message: 'Variação inválida' })
  id?: number;
}

/** Edição completa da peça (tela de edição): mesmas regras do cadastro, variações podem ter id. */
export class EditarProdutoDto extends DadosProdutoDto {
  @IsArray({ message: 'Informe ao menos uma variação (tamanho, cor e estoque)' })
  @ArrayMinSize(1, { message: 'Informe ao menos uma variação (tamanho, cor e estoque)' })
  @ArrayMaxSize(50, { message: 'Uma peça pode ter no máximo 50 variações' })
  @ValidateNested({ each: true })
  @Type(() => EditarVariacaoDto)
  variacoes!: EditarVariacaoDto[];
}

export class AtualizarProdutoDto {
  @Aparar()
  @IsOptional() @IsString({ message: 'O nome deve ser um texto' })
  @IsNotEmpty({ message: 'O nome não pode ficar vazio' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
  nome?: string;

  @Aparar()
  @IsOptional() @IsString({ message: 'A descrição deve ser um texto' })
  @MaxLength(1000, { message: 'A descrição deve ter no máximo 1000 caracteres' })
  descricao?: string;

  @Aparar()
  @IsOptional() @IsString({ message: 'A categoria deve ser um texto' })
  @IsNotEmpty({ message: 'A categoria não pode ficar vazia' })
  @MaxLength(50, { message: 'A categoria deve ter no máximo 50 caracteres' })
  categoria?: string;

  @IsOptional() @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço deve ter no máximo 2 casas decimais' })
  @IsPositive({ message: 'Informe um preço maior que zero' })
  @Max(PRECO_MAXIMO, { message: 'O preço máximo é R$ 100.000,00' })
  preco?: number;

  @Aparar()
  @IsOptional() @IsString()
  @MaxLength(300, { message: 'O endereço da foto deve ter no máximo 300 caracteres' })
  @Matches(URL_FOTO_VALIDA, { message: 'Foto inválida. Envie a imagem pelo formulário da peça' })
  fotoUrl?: string | null;
}

export class FiltroCatalogoDto {
  @IsOptional() @IsString()
  categoria?: string;

  @IsOptional() @IsString()
  tamanho?: string;
}
