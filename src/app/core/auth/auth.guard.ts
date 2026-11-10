import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth.store';

/**
 * Protege las rutas autenticadas. En la primera navegación de la sesión del
 * navegador no sabemos todavía si hay una sesión vigente (el access token es
 * HttpOnly), así que se le pregunta al servidor una sola vez; de ahí en
 * adelante se resuelve en memoria contra AuthStore.
 */
export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const api = inject(AuthApi);
  const router = inject(Router);

  if (store.estaAutenticado()) {
    return true;
  }

  if (!store.estaInicializando()) {
    return router.parseUrl('/iniciar-sesion');
  }

  return api.quienSoy().pipe(
    map((respuesta) => {
      store.establecer(respuesta.usuario);
      return true;
    }),
    catchError(() => {
      store.limpiar();
      return of(router.parseUrl('/iniciar-sesion'));
    }),
  );
};

/** Impide que un usuario ya autenticado vuelva a ver la página de login. */
export const invitadoGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const api = inject(AuthApi);
  const router = inject(Router);

  if (store.estaAutenticado()) {
    return router.parseUrl('/');
  }

  if (!store.estaInicializando()) {
    return true;
  }

  return api.quienSoy().pipe(
    map((respuesta) => {
      store.establecer(respuesta.usuario);
      return router.parseUrl('/');
    }),
    catchError(() => {
      store.limpiar();
      return of(true);
    }),
  );
};
