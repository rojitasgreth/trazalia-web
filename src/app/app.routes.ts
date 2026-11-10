import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./funcionalidades/inicio/pagina-inicio').then((m) => m.PaginaInicio),
  },
  { path: '**', redirectTo: '' },
];
