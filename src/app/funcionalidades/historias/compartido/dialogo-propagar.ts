import { Component, computed, input, output } from '@angular/core';
import type { HistoriaDelPaciente } from '../../../core/historias/historias.model';
import { DialogoHistoria } from './dialogo-historia';
import { TIPOS, etiquetaEstado } from './presentacion';
import type { FilaCambio } from './propagacion';

/**
 * B17 / RF-014 / AC-010: al guardar un dato compartido, pregunta si se aplica
 * solo a esta historia o también a las demás no archivadas del paciente.
 * B18: si la propagación falla, nada se modificó y se ofrecen alternativas.
 */
@Component({
  selector: 'app-dialogo-propagar',
  imports: [DialogoHistoria],
  template: `
    @if (fallo()) {
      <app-dialogo-historia
        icono="aviso"
        variante="error"
        titulo="No pudimos guardar los cambios"
        [texto]="textoError()"
        (cerrar)="cancelar.emit()"
      >
        <p class="nota nota--gris">
          Puedes reintentar, o guardar el cambio solo en esta historia y actualizar
          {{ afectadas().length === 1 ? 'la otra' : 'las otras' }} más tarde.
        </p>
        <ng-container acciones>
          <button type="button" class="terciaria" (click)="cancelar.emit()">
            Volver al formulario
          </button>
          <button type="button" class="hc-boton" data-variante="neutro" (click)="soloEsta.emit()">
            Guardar solo en esta
          </button>
          <button type="button" class="hc-boton" data-variante="primario" (click)="todas.emit()">
            Reintentar
          </button>
        </ng-container>
      </app-dialogo-historia>
    } @else {
      <app-dialogo-historia
        icono="sincronizar"
        variante="info"
        [titulo]="titulo()"
        [texto]="
          'Cambiaste un dato que también está en ' + otraUOtras() + ' de ' + paciente() + '.'
        "
        (cerrar)="cancelar.emit()"
      >
        <div class="lista">
          <span class="lista-titulo">Cambio e historias afectadas</span>
          <ul>
            @for (c of cambios(); track c.etiqueta) {
              <li>
                <span class="clave">{{ c.etiqueta }}</span>
                <span class="valor valor--nuevo">{{ c.antes }} → {{ c.despues }}</span>
              </li>
            }
            @for (h of afectadas(); track h.idHistoria) {
              <li>
                <span class="clave">{{ nombreTipo(h) }} · {{ estado(h) }}</span>
                <span class="valor">Se actualizaría</span>
              </li>
            }
          </ul>
        </div>
        <p class="nota nota--info">
          Las historias archivadas nunca se modifican. El cambio queda registrado en la auditoría.
        </p>
        <ng-container acciones>
          <button type="button" class="terciaria" (click)="cancelar.emit()">Cancelar</button>
          <button type="button" class="hc-boton" data-variante="neutro" (click)="soloEsta.emit()">
            Solo esta historia
          </button>
          <button type="button" class="hc-boton" data-variante="primario" (click)="todas.emit()">
            {{ afectadas().length === 1 ? 'Actualizar ambas' : 'Actualizar todas' }}
          </button>
        </ng-container>
      </app-dialogo-historia>
    }
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
    .valor--nuevo {
      color: var(--color-info);
      font-weight: 700;
    }
    .nota {
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--radio-tarjeta);
      font-size: var(--texto-s);
      line-height: 1.5;
    }
    .nota--info {
      background: var(--color-info-fondo);
      color: var(--color-info);
    }
    .nota--gris {
      background: var(--color-fondo);
      color: var(--color-texto-medio);
    }
    .terciaria {
      min-height: 44px;
      margin-right: auto;
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-primario);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
  `,
})
export class DialogoPropagar {
  readonly paciente = input.required<string>();
  readonly cambios = input.required<FilaCambio[]>();
  readonly afectadas = input.required<HistoriaDelPaciente[]>();
  /** B18: la última propagación falló. */
  readonly fallo = input(false);
  readonly soloEsta = output<void>();
  readonly todas = output<void>();
  readonly cancelar = output<void>();

  protected readonly otraUOtras = computed(() =>
    this.afectadas().length === 1 ? 'otra historia' : 'otras historias',
  );
  protected readonly titulo = computed(
    () =>
      `¿Actualizar también ${this.afectadas().length === 1 ? 'su otra historia' : 'sus otras historias'}?`,
  );
  protected readonly textoError = computed(
    () =>
      `Hubo un error al actualizar las historias de ${this.paciente()}. No se modificó ninguna: tus cambios siguen en el formulario.`,
  );

  protected nombreTipo(h: HistoriaDelPaciente): string {
    return TIPOS[h.tipo].nombre;
  }

  protected estado(h: HistoriaDelPaciente): string {
    return etiquetaEstado(h.estado, h.archivada);
  }
}
