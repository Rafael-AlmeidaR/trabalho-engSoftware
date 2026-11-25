/** Converte Decimal do Prisma (ou string/number) em number com 2 casas. */
export function paraNumero(valor: unknown): number {
  return Math.round(Number(valor) * 100) / 100;
}
