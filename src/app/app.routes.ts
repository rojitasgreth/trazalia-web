import { Routes } from '@angular/router';
import { authGuard, invitadoGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'iniciar-sesion',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./funcionalidades/autenticacion/pagina-inicio-sesion').then(
        (m) => m.PaginaInicioSesion,
      ),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./funcionalidades/inicio/pagina-inicio').then((m) => m.PaginaInicio),
  },
  { path: '**', redirectTo: '' },
];
