import { Transform } from 'class-transformer';

/** Remove espaços do início e do fim (só em textos), para "   " contar como vazio. */
export const Aparar = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

/** Como Aparar, mas um campo opcional vazio vira undefined (não grava "" no banco). */
export const ApararOpcional = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const v = value.trim();
    return v === '' ? undefined : v;
  });

/** Apara e converte o e-mail para minúsculas. */
export const NormalizarEmail = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
