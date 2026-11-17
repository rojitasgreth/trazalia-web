import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import type { TipoHistoria } from '../../../core/historias/historias.model';
import { esTipoValido } from './presentacion';

// TODO(corte 2): habilitar Rehabilitación infantil cuando el formulario
// incluya al representante (SPEC §8.4, RF-015/RF-027).
export const TIPOS_NO_DISPONIBLES: readonly TipoHistoria[] = ['REHAB_INFANTIL'];

export function tipoDisponible(tipo: string | null): tipo is TipoHistoria {
  return esTipoValido(tipo) && !TIPOS_NO_DISPONIBLES.includes(tipo);
}

/** /historias/nueva/:tipo solo admite los tipos disponibles; si no, vuelve a elegir (B06). */
export const tipoHistoriaDisponibleGuard: CanActivateFn = (ruta) =>
  tipoDisponible(ruta.paramMap.get('tipo')) ? true : inject(Router).parseUrl('/historias/nueva');
