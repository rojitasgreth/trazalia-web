import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';
import { SaludApi } from '../../nucleo/api/salud-api';
import { AuthStore } from '../../core/auth/auth.store';

type EstadoApi = 'comprobando' | 'disponible' | 'no-disponible';

/** Panel de inicio: identidad y estado del sistema. */
@Component({
  selector: 'app-pagina-inicio',
  template: `
    <section class="tarjeta">
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
    </section>
  `,
  styles: `
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
  private readonly authStore = inject(AuthStore);

  protected readonly usuario = this.authStore.usuarioActual;

  protected readonly estadoSalud = toSignal(
    this.saludApi.consultar().pipe(
      map((): EstadoApi => 'disponible'),
      startWith<EstadoApi>('comprobando'),
      catchError(() => of<EstadoApi>('no-disponible')),
    ),
    { requireSync: true },
  );
}
