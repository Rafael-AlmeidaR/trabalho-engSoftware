import { SetMetadata } from '@nestjs/common';
import { Perfil } from '../generated/prisma/enums';

export const PERFIS_KEY = 'perfis';
/** Restringe a rota aos perfis informados. Ex.: @Perfis(Perfil.DONO) */
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);
