import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith } from 'rxjs';
import { SaludApi } from '../../nucleo/api/salud-api';
import { Marca } from '../../compartido/ui/marca/marca';

type EstadoApi = 'comprobando' | 'disponible' | 'no-disponible';

/** Página provisional del andamiaje: se reemplaza por el inicio de sesión (A01) en el corte 2. */
@Component({
  selector: 'app-pagina-inicio',
  imports: [Marca],
  template: `
    <main class="tarjeta">
      <app-marca />
      <h1>Trazalia</h1>
      <p class="estado" role="status" [attr.data-estado]="estado()">
        @switch (estado()) {
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
  `,
  styles: `
    :host {
      display: grid;
      min-height: 100dvh;
      place-items: center;
      padding: 24px 16px;
    }
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(100%, 420px);
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

  protected readonly estado = toSignal(
    this.saludApi.consultar().pipe(
      map((): EstadoApi => 'disponible'),
      startWith<EstadoApi>('comprobando'),
      catchError(() => of<EstadoApi>('no-disponible')),
    ),
    { requireSync: true },
  );
}
