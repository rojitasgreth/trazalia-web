import { inject } from '@angular/core';
import { RedirectCommand, Router, type ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { HistoriasApi } from '../../../core/historias/historias-api';
import type { HistoriaDetalle } from '../../../core/historias/historias.model';

/**
 * B16: carga la historia antes de abrir su edición, para construir el
 * formulario de su tipo. Si no existe (o es ajena) vuelve al detalle, que
 * informa "No encontramos esta historia".
 */
export const historiaResolver: ResolveFn<HistoriaDetalle> = (ruta) => {
  const router = inject(Router);
  const id = ruta.paramMap.get('id') ?? '';
  return inject(HistoriasApi)
    .obtener(id)
    .pipe(
      map((respuesta) => respuesta.historia),
      catchError(() => of(new RedirectCommand(router.parseUrl(`/historias/${id}`)))),
    );
};
