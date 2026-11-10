import { Component, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { SaludApi } from '../../nucleo/api/salud-api';
import { Marca } from '../../compartido/ui/marca/marca';
import { AuthStore } from '../../core/auth/auth.store';
import { InactividadServicio } from '../../core/auth/inactividad.servicio';
import { AuthApi } from '../../core/auth/auth-api';
import { ModalInactividad } from '../../compartido/ui/modal-inactividad/modal-inactividad';

type EstadoApi = 'comprobando' | 'disponible' | 'no-disponible';

/** Panel autenticado mínimo del Corte 2: identidad, estado del sistema y aviso de inactividad. */
@Component({
  selector: 'app-pagina-inicio',
  imports: [Marca, ModalInactividad],
  host: {
    '(click)': 'inactividad.registrarActividadUsuario()',
    '(keydown)': 'inactividad.registrarActividadUsuario()',
  },
  template: `
    <div class="pagina">
      <header class="encabezado">
        <app-marca />
        <div class="usuario">
          <span>{{ usuario()?.nombre }} {{ usuario()?.apellido }}</span>
          <button type="button" class="boton-enlace" (click)="cerrarSesion()">Cerrar sesión</button>
        </div>
      </header>

      <main class="tarjeta">
        <h1>Hola, {{ usuario()?.nombre }}</h1>
        <p class="estado" role="status" [attr.data-estado]="estadoSalud()">
          @switch (estadoSalud()) {
            @case ('comprobando') {
              Comprobando la conexión con el servidor…
            }
            @case ('disponible') {
              Servidor disponible.
            }
            @case ('no-disponible') {
              No se pudo conectar con el servidor.
            }
          }
        </p>
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
      justify-content: space-between;
      gap: 12px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--color-borde-suave);
      background: var(--color-superficie);
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
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(100%, 420px);
      margin: 48px auto;
      padding: 32px 24px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
      line-height: 1.15;
    }
    .estado {
      margin: 0;
      color: var(--color-texto-secundario);
    }
    .estado[data-estado='disponible'] {
      color: var(--color-exito);
    }
    .estado[data-estado='no-disponible'] {
      color: var(--color-aviso);
    }
  `,
})
export class PaginaInicio {
  private readonly saludApi = inject(SaludApi);
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly inactividad = inject(InactividadServicio);

  protected readonly usuario = this.authStore.usuarioActual;

  protected readonly estadoSalud = toSignal(
    this.saludApi.consultar().pipe(
      map((): EstadoApi => 'disponible'),
      startWith<EstadoApi>('comprobando'),
      catchError(() => of<EstadoApi>('no-disponible')),
    ),
    { requireSync: true },
  );

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
