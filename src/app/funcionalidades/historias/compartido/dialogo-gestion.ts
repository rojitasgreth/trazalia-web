import { Component, computed, input, output, signal } from '@angular/core';
import type { HistoriaDetalle } from '../../../core/historias/historias.model';
import { DialogoHistoria, type IconoDialogo } from './dialogo-historia';
import { TIPOS, etiquetaEstado, formatearDocumento, formatearMomentoEnFrase } from './presentacion';

export type AccionGestion = 'eliminar' | 'eliminarBloqueado' | 'archivar';

interface Contenido {
  icono: IconoDialogo;
  variante: 'aviso' | 'neutro';
  titulo: string;
  texto: string;
  meta: string;
  nota: string;
  notaInfo: boolean;
  confirmacion: string;
  primario: string;
  peligro: boolean;
}

/**
 * B25 Eliminar definitivamente · B26 Eliminación bloqueada (ofrece archivar)
 * · B27 Archivar historia (SPEC §11 y §13; textos del prototipo).
 */
@Component({
  selector: 'app-dialogo-gestion',
  imports: [DialogoHistoria],
  template: `
    @let c = contenido();
    <app-dialogo-historia
      [icono]="c.icono"
      [variante]="c.variante"
      [titulo]="c.titulo"
      [texto]="c.texto"
      (cerrar)="cancelar.emit()"
    >
      <div class="tarjeta">
        <div class="tarjeta-datos">
          <span class="nombre">{{ historia().nombre }} {{ historia().apellido }}</span>
          <span class="sub">{{ tipo() }} · {{ documento() }}</span>
          <span class="meta">{{ c.meta }}</span>
        </div>
        <span class="hc-chip" [attr.data-estado]="estado().toLowerCase()">{{ estado() }}</span>
      </div>
      <p [class]="c.notaInfo ? 'nota nota--info' : 'nota'">{{ c.nota }}</p>
      @if (c.confirmacion) {
        <label class="confirmacion">
          <input
            type="checkbox"
            [checked]="confirmado()"
            (change)="confirmado.set(!confirmado())"
          />
          {{ c.confirmacion }}
        </label>
      }
      <ng-container acciones>
        <button type="button" class="hc-boton" data-variante="neutro" (click)="cancelar.emit()">
          Cancelar
        </button>
        <button
          type="button"
          class="hc-boton"
          [attr.data-variante]="c.peligro ? 'peligro' : 'primario'"
          [disabled]="ocupado() || (!!c.confirmacion && !confirmado())"
          (click)="confirmar.emit()"
        >
          {{ c.primario }}
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
    .nota {
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--radio-tarjeta);
      background: var(--color-fondo);
      color: var(--color-texto-medio);
      font-size: var(--texto-s);
      line-height: 1.5;
    }
    .nota--info {
      background: var(--color-info-fondo);
      color: var(--color-info);
    }
    .confirmacion {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      font-weight: 600;
      cursor: pointer;
    }
    .confirmacion input {
      width: 20px;
      height: 20px;
      margin: 0;
      accent-color: var(--color-aviso);
    }
  `,
})
export class DialogoGestion {
  readonly accion = input.required<AccionGestion>();
  readonly historia = input.required<HistoriaDetalle>();
  /** Mientras la petición está en curso. */
  readonly ocupado = input(false);
  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  protected readonly confirmado = signal(false);
  private readonly ahora = new Date();

  protected readonly tipo = computed(() => TIPOS[this.historia().tipo].nombre);
  protected readonly documento = computed(() => formatearDocumento(this.historia()));
  protected readonly estado = computed(() =>
    etiquetaEstado(this.historia().estado, this.historia().archivada),
  );

  protected readonly contenido = computed<Contenido>(() => {
    const h = this.historia();
    switch (this.accion()) {
      case 'eliminar':
        return {
          icono: 'eliminar',
          variante: 'aviso',
          titulo: '¿Eliminar esta historia definitivamente?',
          texto:
            'No tiene registros clínicos, así que se puede borrar. Se eliminará de forma permanente y no se puede deshacer.',
          meta: `Creada ${formatearMomentoEnFrase(h.fechaCreacion, this.ahora)}`,
          nota: 'Solo quedará un registro de auditoría con el identificador de la historia, quién la eliminó y cuándo. No se guarda copia de los datos.',
          notaInfo: false,
          confirmacion: 'Entiendo que esta acción no se puede deshacer',
          primario: 'Eliminar definitivamente',
          peligro: true,
        };
      case 'eliminarBloqueado':
        return {
          icono: 'candado',
          variante: 'neutro',
          titulo: 'Esta historia no se puede eliminar',
          texto: 'Tiene registros clínicos asociados, y esos registros deben conservarse.',
          meta: 'Tiene registros clínicos asociados',
          nota: 'Puedes archivarla: sale del listado principal, queda de solo lectura en "Archivadas" y puedes desarchivarla cuando quieras.',
          notaInfo: true,
          confirmacion: '',
          primario: 'Archivar historia',
          peligro: false,
        };
      case 'archivar':
        return {
          icono: 'archivo',
          variante: 'neutro',
          titulo: '¿Archivar esta historia?',
          texto:
            'Saldrá del listado principal y quedará de solo lectura en "Archivadas". Puedes desarchivarla cuando quieras.',
          meta: `Actualizada ${formatearMomentoEnFrase(h.fechaActualizacion, this.ahora)}`,
          nota: 'Mientras esté archivada, los cambios de datos personales hechos en otras historias del paciente no se le aplicarán.',
          notaInfo: false,
          confirmacion: '',
          primario: 'Archivar',
          peligro: false,
        };
    }
  });
}
