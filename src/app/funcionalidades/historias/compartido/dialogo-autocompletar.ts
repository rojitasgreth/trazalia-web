import { Component, computed, input, output } from '@angular/core';
import type { HistoriaResumen, TipoHistoria } from '../../../core/historias/historias.model';
import type { FilaAutocompletado } from './autocompletado';
import { DialogoHistoria } from './dialogo-historia';
import { TIPOS, formatearDocumento } from './presentacion';

/** B14 · Propuesta de autocompletado con los datos de otra historia (RF-012, AC-007). */
@Component({
  selector: 'app-dialogo-autocompletar',
  imports: [DialogoHistoria],
  template: `
    <app-dialogo-historia
      icono="copia"
      variante="exito"
      titulo="Encontramos otra historia de este paciente"
      [texto]="texto()"
      (cerrar)="enBlanco.emit()"
    >
      <div class="lista">
        <span class="lista-titulo">Se copiarán y podrás editarlos</span>
        <ul>
          @for (fila of filas(); track fila.etiqueta) {
            <li>
              <span class="clave">{{ fila.etiqueta }}</span>
              <span [class]="fila.existe ? 'valor' : 'valor valor--ausente'">{{ fila.valor }}</span>
            </li>
          }
        </ul>
      </div>
      <ng-container acciones>
        <button type="button" class="hc-boton" data-variante="neutro" (click)="enBlanco.emit()">
          Empezar en blanco
        </button>
        <button type="button" class="hc-boton" data-variante="primario" (click)="usar.emit()">
          Usar estos datos
        </button>
      </ng-container>
    </app-dialogo-historia>
  `,
  styles: `
    .lista {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .lista-titulo {
      font-size: var(--texto-s);
      font-weight: 700;
    }
    ul {
      margin: 0;
      padding: 0;
      overflow: hidden;
      border: 1px solid var(--color-borde-suave);
      border-radius: 14px;
      list-style: none;
    }
    li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      font-size: var(--texto-s);
    }
    li + li {
      border-top: 1px solid var(--color-superficie-sutil);
    }
    .clave {
      color: var(--color-texto-secundario);
    }
    .valor {
      font-weight: 600;
      text-align: right;
    }
    .valor--ausente {
      color: var(--color-texto-secundario);
      font-style: italic;
      font-weight: 400;
    }
  `,
})
export class DialogoAutocompletar {
  /** Historia de otro tipo del mismo paciente. */
  readonly origen = input.required<HistoriaResumen>();
  readonly tipoDestino = input.required<TipoHistoria>();
  readonly filas = input.required<FilaAutocompletado[]>();
  readonly usar = output<void>();
  readonly enBlanco = output<void>();

  protected readonly texto = computed(() => {
    const o = this.origen();
    return `${o.nombre} ${o.apellido} (${formatearDocumento(o)}) tiene una historia de ${
      TIPOS[o.tipo].nombre
    }. ¿Quieres usar sus datos personales en la nueva historia de ${TIPOS[this.tipoDestino()].nombre}?`;
  });
}
