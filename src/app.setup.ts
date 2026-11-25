import { BadRequestException, INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';

/** Nome amigável dos itens de listas validadas, para as mensagens ficarem "Variação 2: Informe a cor". */
const ROTULOS: Record<string, string> = { variacoes: 'Variação', itens: 'Item' };

/** Junta as mensagens de validação (inclusive de objetos aninhados) numa lista legível. */
function mensagens(erros: ValidationError[], prefixo = ''): string[] {
  return erros.flatMap((e) => {
    const proprias = Object.entries(e.constraints ?? {}).map(([regra, m]) =>
      prefixo + (regra === 'whitelistValidation' ? `Campo não permitido: ${e.property}` : m));
    const filhos = (e.children ?? []).flatMap((filho) => {
      const indice = Number(filho.property);
      const rotulo = ROTULOS[e.property];
      const novoPrefixo = rotulo && Number.isInteger(indice) ? `${rotulo} ${indice + 1}: ` : prefixo;
      return mensagens(Number.isInteger(indice) ? (filho.children ?? []) : [filho], novoPrefixo)
        .concat(Object.values(filho.constraints ?? {}).map((m) => novoPrefixo + m));
    });
    return [...proprias, ...filhos];
  });
}

/** Configuração compartilhada entre a aplicação real e os testes e2e. */
export function configurarApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, transform: true, forbidNonWhitelisted: true,
      exceptionFactory: (erros) => new BadRequestException([...new Set(mensagens(erros))]),
    }),
  );
  app.enableCors();
}
