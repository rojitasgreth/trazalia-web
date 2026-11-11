import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthStore } from '../../../core/auth/auth.store';
import { InactividadServicio } from '../../../core/auth/inactividad.servicio';
import { Marca } from '../marca/marca';
import { ModalInactividad } from '../modal-inactividad/modal-inactividad';

/**
 * Layout común a toda página autenticada: cabecera, navegación, aviso de
 * inactividad (BR-022/023) y el <router-outlet> de la zona privada.
 */
@Component({
  selector: 'app-shell-autenticado',
  imports: [Marca, ModalInactividad, RouterLink, RouterLinkActive, RouterOutlet],
  host: {
    '(click)': 'inactividad.registrarActividadUsuario()',
    '(keydown)': 'inactividad.registrarActividadUsuario()',
  },
  template: `
    <div class="pagina">
      <header class="encabezado">
        <app-marca />
        <nav class="navegacion" aria-label="Principal">
          <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
            >Inicio</a
          >
          @if (usuario()?.rol === 'ADMINISTRADOR') {
            <a routerLink="/usuarios" routerLinkActive="activo">Usuarios</a>
          }
        </nav>
        <div class="usuario">
          <span>{{ usuario()?.nombre }} {{ usuario()?.apellido }}</span>
          <button type="button" class="boton-enlace" (click)="cerrarSesion()">Cerrar sesión</button>
        </div>
      </header>

      <main class="contenido">
        <router-outlet />
      </main>
    </div>

    <app-modal-inactividad
      [visible]="inactividad.mostrarAdvertencia()"
      [segundosRestantes]="inactividad.segundosRestantes()"
      (continuar)="inactividad.continuar()"
      (cerrar)="inactividad.cerrarPorEleccion()"
    />
  `,
  styles: `
    .pagina {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
    }
    .encabezado {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--color-borde-suave);
      background: var(--color-superficie);
    }
    .navegacion {
      display: flex;
      gap: 16px;
      flex: 1;
    }
    .navegacion a {
      color: var(--color-texto-medio);
      font-weight: 600;
      text-decoration: none;
      padding: 6px 2px;
      border-bottom: 2px solid transparent;
    }
    .navegacion a:hover {
      color: var(--color-primario);
    }
    .navegacion a.activo {
      color: var(--color-primario);
      border-bottom-color: var(--color-primario);
    }
    .usuario {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: var(--texto-s);
      color: var(--color-texto-medio);
    }
    .boton-enlace {
      border: none;
      background: none;
      padding: 0;
      color: var(--color-primario);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .boton-enlace:hover {
      color: var(--color-primario-hover);
    }
    .contenido {
      flex: 1;
    }
  `,
})
export class ShellAutenticado {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly inactividad = inject(InactividadServicio);

  protected readonly usuario = this.authStore.usuarioActual;

  constructor() {
    this.inactividad.iniciar();
    inject(DestroyRef).onDestroy(() => this.inactividad.detener());
  }

  protected cerrarSesion(): void {
    this.authApi.cerrarSesion().subscribe({
      complete: () => this.finalizarSesion(),
      error: () => this.finalizarSesion(),
    });
  }

  private finalizarSesion(): void {
    this.authStore.limpiar();
    void this.router.navigate(['/iniciar-sesion']);
  }
}
