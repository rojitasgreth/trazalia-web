import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from './auth.store';

/**
 * Oculta Historias clínicas a quien no es FISIOTERAPEUTA (RF-001). Solo UX:
 * la autorización real la aplica el backend (RolesGuard).
 */
export const fisioterapeutaGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  return store.usuarioActual()?.rol === 'FISIOTERAPEUTA' ? true : router.parseUrl('/');
};
