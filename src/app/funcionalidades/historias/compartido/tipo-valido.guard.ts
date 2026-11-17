import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { esTipoValido } from './presentacion';

/** /historias/nueva/:tipo solo admite los cuatro tipos; si no, vuelve a elegir (B06). */
export const tipoHistoriaValidoGuard: CanActivateFn = (ruta) =>
  esTipoValido(ruta.paramMap.get('tipo')) ? true : inject(Router).parseUrl('/historias/nueva');
