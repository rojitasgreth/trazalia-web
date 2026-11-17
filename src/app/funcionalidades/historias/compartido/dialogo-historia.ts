import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';

export type IconoDialogo = 'aviso' | 'copia' | 'sincronizar' | 'eliminar' | 'candado' | 'archivo';

// Trazos de los iconos de los diálogos del prototipo (B13–B27).
const TRAZOS: Record<IconoDialogo, string> = {
  aviso: 'M12 4l9 16H3zM12 10v4M12 17v.5',
  copia: 'M8 8h11v11H8zM16 8V5H5v11h3',
  sincronizar: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  eliminar: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  candado: 'M5 11h14v10H5zM8 11V8a4 4 0 0 1 8 0v3',
  archivo: 'M3 4h18v5H3zM5 9v11h14V9M10 13h4',
};

/**
 * Marco común de los diálogos de historias (B13–B27): icono, título, texto y
 * pie de acciones. El contenido intermedio (tarjeta, lista, notas) y los
 * botones se proyectan.
 */
@Component({
  selector: 'app-dialogo-historia',
  imports: [CdkTrapFocus],
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="velo" role="presentation">
      <div
        class="dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-texto"
        cdkTrapFocus
        cdkTrapFocusAutoCapture
      >
        <div class="encabezado">
          <div class="icono" [attr.data-variante]="variante()">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path [attr.d]="trazo()" />
            </svg>
          </div>
          <div class="textos">
            <h2 id="dialogo-titulo">{{ titulo() }}</h2>
            <p id="dialogo-texto">{{ texto() }}</p>
          </div>
        </div>
        <ng-content />
        <div class="acciones">
          <ng-content select="[acciones]" />
        </div>
      </div>
    </div>
  `,
  styles: `
    .velo {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      background: var(--color-velo);
    }
    .dialogo {
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: 100%;
      max-width: 580px;
      max-height: 100%;
      overflow-y: auto;
      padding: 28px;
      border-radius: 20px;
      background: var(--color-superficie);
      box-shadow: 0 24px 60px rgb(21 32 27 / 0.25);
    }
    .encabezado {
      display: flex;
      gap: 14px;
      align-items: flex-start;
    }
    .icono {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
    }
    .icono[data-variante='aviso'] {
      background: var(--color-aviso-fondo);
      color: var(--color-aviso);
    }
    .icono[data-variante='exito'] {
      background: var(--color-primario-suave);
      color: var(--color-primario-hover);
    }
    .icono[data-variante='info'] {
      background: var(--color-info-fondo);
      color: var(--color-info);
    }
    .icono[data-variante='error'] {
      background: var(--color-peligro-fondo);
      color: var(--color-peligro);
    }
    .icono[data-variante='neutro'] {
      background: var(--color-superficie-sutil);
      color: var(--color-texto-medio);
    }
    .textos {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 6px;
    }
    h2 {
      margin: 0;
      font-size: 21px;
      line-height: 1.3;
    }
    p {
      margin: 0;
      color: var(--color-texto-medio);
      line-height: 1.55;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap-reverse;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      padding-top: 18px;
      border-top: 1px solid var(--color-superficie-sutil);
    }
  `,
})
export class DialogoHistoria {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();
  readonly icono = input.required<IconoDialogo>();
  readonly variante = input<'aviso' | 'exito' | 'info' | 'error' | 'neutro'>('aviso');
  readonly cerrar = output<void>();

  protected trazo(): string {
    return TRAZOS[this.icono()];
  }
}
