import { Component, computed, input, output } from '@angular/core';
import type { HistoriaResumen } from '../../../core/historias/historias.model';
import { DialogoHistoria } from './dialogo-historia';
import { TIPOS, etiquetaEstado, formatearDocumento, formatearMomentoEnFrase } from './presentacion';

/** B13 · Duplicado del mismo tipo: no se crea y se ofrece abrir la existente (RF-010). */
@Component({
  selector: 'app-dialogo-duplicado',
  imports: [DialogoHistoria],
  template: `
    <app-dialogo-historia
      icono="aviso"
      variante="aviso"
      [titulo]="titulo()"
      [texto]="texto()"
      (cerrar)="volver.emit()"
    >
      <div class="tarjeta">
        <div class="tarjeta-datos">
          <span class="nombre">{{ historia().nombre }} {{ historia().apellido }}</span>
          <span class="sub">{{ tipo().nombre }} · {{ documento() }}</span>
          <span class="meta">Actualizada {{ actualizada() }}</span>
        </div>
        <span class="hc-chip" [attr.data-estado]="estado().toLowerCase()">{{ estado() }}</span>
      </div>
      <ng-container acciones>
        <button type="button" class="hc-boton" data-variante="neutro" (click)="volver.emit()">
          Volver al formulario
        </button>
        <button type="button" class="hc-boton" data-variante="primario" (click)="abrir.emit()">
          Abrir historia existente
        </button>
      </ng-container>
    </app-dialogo-historia>
  `,
  styles: `
    .tarjeta {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--color-fondo);
    }
    .tarjeta-datos {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .nombre {
      font-size: var(--texto-l);
      font-weight: 700;
    }
    .sub {
      color: var(--color-texto-medio);
      font-size: var(--texto-s);
    }
    .meta {
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
    }
  `,
})
export class DialogoDuplicado {
  readonly historia = input.required<HistoriaResumen>();
  readonly volver = output<void>();
  readonly abrir = output<void>();

  private readonly ahora = new Date();

  protected readonly tipo = computed(() => TIPOS[this.historia().tipo]);
  protected readonly documento = computed(() => formatearDocumento(this.historia()));
  protected readonly estado = computed(() =>
    etiquetaEstado(this.historia().estado, this.historia().archivada),
  );
  protected readonly actualizada = computed(() =>
    formatearMomentoEnFrase(this.historia().fechaActualizacion, this.ahora),
  );
  protected readonly titulo = computed(
    () => `Este paciente ya tiene una historia de ${this.tipo().nombre}`,
  );
  protected readonly texto = computed(() => {
    const coincidencia = this.historia().sinDocumento
      ? 'Coinciden el nombre, el apellido y la fecha de nacimiento.'
      : `Coincide la cédula ${this.documento()}.`;
    return `${coincidencia} Cada paciente puede tener una sola historia de cada tipo, así que no se creó una nueva.`;
  });
}
