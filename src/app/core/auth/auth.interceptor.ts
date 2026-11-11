import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth.store';

const RUTAS_SIN_REINTENTO = ['/iniciar-sesion', '/renovar', '/invitaciones/aceptar'];

/**
 * Ante un 401, intenta renovar la sesión una sola vez y repite la solicitud
 * original (flujo 7.3). Si la renovación también falla, limpia el estado.
 *
 * GET /autenticacion/yo es la propia sonda de sesión que usan authGuard e
 * invitadoGuard: cada uno ya sabe qué hacer con su fallo (redirigir a login,
 * o simplemente dejar pasar en una página pública como /activar-cuenta). Por
 * eso aquí no se fuerza una navegación para esa ruta — forzarla aquí
 * atropellaba el destino correcto que decide el guard con un '/iniciar-sesion'
 * fijo, incluso en rutas públicas donde no corresponde.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const api = inject(AuthApi);
  const store = inject(AuthStore);
  const router = inject(Router);

  const esRutaDeAutenticacionPublica = RUTAS_SIN_REINTENTO.some((ruta) => req.url.includes(ruta));
  if (esRutaDeAutenticacionPublica) {
    return next(req);
  }

  const esSondeoDeSesion = req.url.includes('/autenticacion/yo');

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return api.renovar().pipe(
          switchMap(() => next(req)),
          catchError(() => {
            store.limpiar();
            if (!esSondeoDeSesion) {
              void router.navigate(['/iniciar-sesion']);
            }
            return throwError(() => error);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
