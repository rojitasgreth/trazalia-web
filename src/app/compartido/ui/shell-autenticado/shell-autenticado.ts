import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth-api';
import { AuthStore } from '../../../core/auth/auth.store';
import { InactividadServicio } from '../../../core/auth/inactividad.servicio';
import { Marca } from '../marca/marca';
import { ModalInactividad } from '../modal-inactividad/modal-inactividad';

/**
 * Layout común a toda página autenticada: barra lateral de navegación (A13/
 * A14/A15, diseño real del prototipo), encabezado con identidad y cerrar
 * sesión, aviso de inactividad (BR-022/023) y el <router-outlet> de la zona
 * privada.
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
      <nav class="barra-lateral" aria-label="Administración">
        <div class="marca-lateral">
          <app-marca />
        </div>
        <a routerLink="/" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }"
          >Inicio</a
        >
        @if (usuario()?.rol === 'ADMINISTRADOR') {
          <a routerLink="/usuarios" routerLinkActive="activo">Usuarios</a>
          <a routerLink="/auditoria" routerLinkActive="activo">Auditoría</a>
        }
        <a routerLink="/mi-cuenta" routerLinkActive="activo">Mi cuenta</a>
      </nav>

      <div class="area-principal">
        <header class="encabezado">
          <span>{{ usuario()?.nombre }} {{ usuario()?.apellido }}</span>
          <button type="button" class="boton-enlace" (click)="cerrarSesion()">Cerrar sesión</button>
        </header>

        <main class="contenido">
          <router-outlet />
        </main>
      </div>
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
      flex-wrap: wrap;
      min-height: 100dvh;
    }
    .barra-lateral {
      flex: 1 1 220px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 24px 16px;
      background: #15201b;
      color: #ffffff;
    }
    .marca-lateral {
      padding: 0 8px 20px;
    }
    .barra-lateral a {
      min-height: 44px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      border-radius: 10px;
      color: #c9d2ce;
      text-decoration: none;
      font-size: var(--texto-m);
    }
    .barra-lateral a:hover {
      color: #ffffff;
    }
    .barra-lateral a.activo {
      background: #2a3631;
      color: #ffffff;
      font-weight: 600;
    }
    .area-principal {
      flex: 999 1 560px;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .encabezado {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--color-borde-suave);
      background: var(--color-superficie);
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
      background: var(--color-fondo);
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
