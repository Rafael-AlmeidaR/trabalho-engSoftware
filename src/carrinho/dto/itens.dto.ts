import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Max, Min, ValidateNested } from 'class-validator';

export class ItemCarrinhoDto {
  @IsInt({ message: 'Variação inválida' }) @Min(1, { message: 'Variação inválida' })
  variacaoId!: number;

  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade mínima é 1' })
  @Max(1000, { message: 'A quantidade máxima por item é 1000' })
  quantidade!: number;
}

export class ItensCarrinhoDto {
  @IsArray({ message: 'O carrinho está vazio' })
  @ArrayMinSize(1, { message: 'O carrinho está vazio' })
  @ArrayMaxSize(100, { message: 'O carrinho pode ter no máximo 100 itens diferentes' })
  @ValidateNested({ each: true })
  @Type(() => ItemCarrinhoDto)
  itens!: ItemCarrinhoDto[];
}
