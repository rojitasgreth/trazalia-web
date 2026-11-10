import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, computed, input, output } from '@angular/core';

/** Spec A17/A18: aviso a los 55 min, 5 min para elegir continuar o cerrar. */
@Component({
  selector: 'app-modal-inactividad',
  imports: [CdkTrapFocus],
  template: `
    @if (visible()) {
      <div class="velo" role="presentation">
        <div
          class="dialogo"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-inactividad"
          aria-describedby="descripcion-inactividad"
          cdkTrapFocus
          cdkTrapFocusAutoCapture
        >
          <h2 id="titulo-inactividad">¿Sigues ahí?</h2>
          <p id="descripcion-inactividad">
            Por tu seguridad, la sesión se cerrará por inactividad en
            <strong>{{ tiempoRestante() }}</strong> si no respondes.
          </p>
          <div class="acciones">
            <button type="button" class="boton boton--secundario" (click)="cerrar.emit()">
              Cerrar sesión
            </button>
            <button type="button" class="boton boton--primario" (click)="continuar.emit()">
              Continuar conectado
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .velo {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 16px;
      background: var(--color-velo);
      z-index: 100;
    }
    .dialogo {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: min(100%, 400px);
      padding: 24px;
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    h2 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    p {
      margin: 0;
      color: var(--color-texto-medio);
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
    .boton {
      padding: 10px 18px;
      border-radius: var(--radio-control);
      border: 1px solid transparent;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .boton--primario {
      background: var(--color-primario);
      color: var(--color-sobre-primario);
    }
    .boton--primario:hover {
      background: var(--color-primario-hover);
    }
    .boton--secundario {
      background: transparent;
      border-color: var(--color-borde);
      color: var(--color-texto);
    }
  `,
})
export class ModalInactividad {
  readonly visible = input.required<boolean>();
  readonly segundosRestantes = input.required<number>();
  readonly continuar = output<void>();
  readonly cerrar = output<void>();

  protected readonly tiempoRestante = computed(() => {
    const total = this.segundosRestantes();
    const minutos = Math.floor(total / 60);
    const segundos = total % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
  });
}
