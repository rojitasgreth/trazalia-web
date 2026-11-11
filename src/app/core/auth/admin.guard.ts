import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';

/**
 * Oculta las rutas de administración (/usuarios) a quien no es ADMINISTRADOR.
 * Solo UX: la autorización real la aplica el backend (RolesGuard).
 */
export const adminGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  return store.usuarioActual()?.rol === 'ADMINISTRADOR' ? true : router.parseUrl('/');
};
