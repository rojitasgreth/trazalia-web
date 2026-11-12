import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
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
    path: 'activar-cuenta',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./funcionalidades/autenticacion/pagina-activar-cuenta').then(
        (m) => m.PaginaActivarCuenta,
      ),
  },
  {
    path: 'recuperar',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./funcionalidades/autenticacion/pagina-recuperar').then((m) => m.PaginaRecuperar),
  },
  {
    path: 'restablecer-contrasena',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./funcionalidades/autenticacion/pagina-restablecer').then((m) => m.PaginaRestablecer),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./compartido/ui/shell-autenticado/shell-autenticado').then((m) => m.ShellAutenticado),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./funcionalidades/inicio/pagina-inicio').then((m) => m.PaginaInicio),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./funcionalidades/usuarios/pagina-listado-usuarios').then(
            (m) => m.PaginaListadoUsuarios,
          ),
      },
      {
        path: 'usuarios/nuevo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./funcionalidades/usuarios/pagina-crear-usuario').then(
            (m) => m.PaginaCrearUsuario,
          ),
      },
      {
        path: 'usuarios/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./funcionalidades/usuarios/pagina-detalle-usuario').then(
            (m) => m.PaginaDetalleUsuario,
          ),
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./funcionalidades/auditoria/pagina-auditoria').then((m) => m.PaginaAuditoria),
      },
      {
        path: 'mi-cuenta',
        loadComponent: () =>
          import('./funcionalidades/mi-cuenta/pagina-mi-cuenta').then((m) => m.PaginaMiCuenta),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
