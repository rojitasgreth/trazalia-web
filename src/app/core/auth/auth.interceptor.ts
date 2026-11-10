import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth.store';

const RUTAS_SIN_REINTENTO = ['/iniciar-sesion', '/renovar', '/invitaciones/aceptar'];

/**
 * Ante un 401, intenta renovar la sesión una sola vez y repite la solicitud
 * original (flujo 7.3). Si la renovación también falla, limpia el estado y
 * manda a iniciar sesión.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(AuthApi);
  const store = inject(AuthStore);
  const router = inject(Router);

  const esRutaDeAutenticacionPublica = RUTAS_SIN_REINTENTO.some((ruta) => req.url.includes(ruta));
  if (esRutaDeAutenticacionPublica) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return api.renovar().pipe(
          switchMap(() => next(req)),
          catchError(() => {
            store.limpiar();
            void router.navigate(['/iniciar-sesion']);
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
