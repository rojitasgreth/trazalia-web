import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { CentrosApi, normalizarTexto } from '../../../core/centros/centros-api';
import type { CentroMedico } from '../../../core/centros/centros.model';

const ESPERA_MS = 250;
const MINIMO = 2;

/**
 * B29/B30 · Buscador del catálogo compartido de centros médicos (SPEC B v1.4
 * §8.7). Muestra resultados mientras se escribe y, solo si ninguno coincide
 * exactamente con lo escrito, ofrece agregarlo como centro nuevo. Sigue el
 * patrón ARIA combobox + listbox.
 */
@Component({
  selector: 'app-buscador-centro',
  host: { '(focusout)': 'alSalir($event)' },
  template: `
    @if (centro(); as elegido) {
      <div class="elegido">
        <div class="elegido-datos">
          <span class="elegido-nombre">{{ elegido.nombre }}</span>
          <span class="elegido-ubicacion"
            >{{ elegido.parroquia }}, {{ elegido.municipio }}, {{ elegido.estado
            }}{{ elegido.comunidad ? ' · ' + elegido.comunidad : '' }}</span
          >
        </div>
        <button type="button" class="cambiar" (click)="cambiar()">Cambiar</button>
      </div>
    } @else {
      <input
        [id]="idCampo()"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        placeholder="Escribe el nombre del centro"
        [attr.aria-expanded]="abierto()"
        [attr.aria-controls]="idLista()"
        [attr.aria-activedescendant]="activo() >= 0 ? idOpcion(activo()) : null"
        [attr.aria-invalid]="invalido()"
        [attr.aria-describedby]="descripcion() || null"
        [class.invalido]="invalido()"
        [value]="texto()"
        (input)="escribir($any($event.target).value)"
        (keydown)="teclado($event)"
      />
      @if (abierto()) {
        <ul class="lista" role="listbox" [id]="idLista()" aria-label="Centros médicos">
          @if (buscando()) {
            <li class="estado" role="presentation">Buscando…</li>
          }
          @for (c of resultados(); track c.idCentro; let i = $index) {
            <li
              role="option"
              [id]="idOpcion(i)"
              [attr.aria-selected]="activo() === i"
              [class.activo]="activo() === i"
              (mousedown)="$event.preventDefault()"
              tabindex="-1"
              (click)="elegirCentro(c)"
              (keydown.enter)="elegirCentro(c)"
            >
              <span class="opcion-nombre">{{ c.nombre }}</span>
              <span class="opcion-ubicacion">{{ c.municipio }}, {{ c.estado }}</span>
            </li>
          }
          @if (!buscando() && resultados().length === 0) {
            <li class="estado" role="presentation">No hay centros con ese nombre.</li>
          }
          @if (puedeAgregar()) {
            <li
              role="option"
              class="agregar"
              [id]="idOpcion(resultados().length)"
              [attr.aria-selected]="activo() === resultados().length"
              [class.activo]="activo() === resultados().length"
              (mousedown)="$event.preventDefault()"
              tabindex="-1"
              (click)="pedirNuevo()"
              (keydown.enter)="pedirNuevo()"
            >
              + Agregar «{{ texto().trim() }}» como nuevo centro
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    input {
      width: 100%;
      height: 48px;
      padding: 0 14px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
      font-size: var(--texto-l);
    }
    input.invalido {
      border: 2px solid var(--color-borde-error);
    }
    .lista {
      position: absolute;
      z-index: 20;
      top: calc(100% + 4px);
      right: 0;
      left: 0;
      max-height: 300px;
      margin: 0;
      padding: 6px;
      overflow-y: auto;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
      box-shadow: 0 12px 32px rgb(21 32 27 / 0.14);
      list-style: none;
    }
    li[role='option'] {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
      border-radius: var(--radio-control);
      cursor: pointer;
    }
    li[role='option'].activo,
    li[role='option']:hover {
      background: var(--color-seleccion-fondo);
    }
    .opcion-nombre {
      font-weight: 600;
    }
    .opcion-ubicacion,
    .estado {
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
    }
    .estado {
      padding: 10px 12px;
    }
    .agregar {
      margin-top: 4px;
      border-top: 1px solid var(--color-superficie-sutil);
      color: var(--color-primario);
      font-weight: 700;
    }
    .elegido {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border: 2px solid var(--color-primario);
      border-radius: var(--radio-tarjeta);
      background: var(--color-seleccion-fondo);
    }
    .elegido-datos {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .elegido-nombre {
      font-weight: 700;
    }
    .elegido-ubicacion {
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
    }
    .cambiar {
      min-height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
  `,
})
export class BuscadorCentro {
  private readonly api = inject(CentrosApi);

  readonly idCampo = input('centro');
  readonly centro = input<CentroMedico | null>(null);
  readonly invalido = input(false);
  /** id del mensaje de ayuda o error asociado al campo. */
  readonly descripcion = input('');
  readonly elegir = output<CentroMedico | null>();
  /** El usuario quiere registrar un centro nuevo con este nombre (B31). */
  readonly agregar = output<string>();

  protected readonly texto = signal('');
  protected readonly resultados = signal<CentroMedico[]>([]);
  protected readonly buscando = signal(false);
  protected readonly abierto = signal(false);
  protected readonly activo = signal(-1);

  private temporizador?: ReturnType<typeof setTimeout>;
  private consulta = 0;

  /** Solo si nada de lo encontrado se llama exactamente igual (sin tildes ni mayúsculas). */
  protected readonly puedeAgregar = computed(() => {
    const escrito = normalizarTexto(this.texto());
    return (
      !this.buscando() &&
      escrito.length >= MINIMO &&
      !this.resultados().some((c) => normalizarTexto(c.nombre) === escrito)
    );
  });

  private readonly totalOpciones = computed(
    () => this.resultados().length + (this.puedeAgregar() ? 1 : 0),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  protected idLista(): string {
    return `${this.idCampo()}-lista`;
  }

  protected idOpcion(indice: number): string {
    return `${this.idCampo()}-opcion-${indice}`;
  }

  protected escribir(valor: string): void {
    this.texto.set(valor);
    this.activo.set(-1);
    clearTimeout(this.temporizador);
    if (normalizarTexto(valor).length < MINIMO) {
      this.abierto.set(false);
      this.resultados.set([]);
      return;
    }
    this.abierto.set(true);
    this.buscando.set(true);
    this.temporizador = setTimeout(() => this.buscar(valor), ESPERA_MS);
  }

  private buscar(valor: string): void {
    const numero = ++this.consulta;
    this.api.buscar(valor.trim()).subscribe({
      next: (centros) => {
        // Una respuesta vieja no pisa la de una búsqueda más reciente.
        if (numero !== this.consulta) return;
        this.resultados.set(centros);
        this.buscando.set(false);
      },
      error: () => {
        if (numero !== this.consulta) return;
        this.resultados.set([]);
        this.buscando.set(false);
      },
    });
  }

  protected teclado(evento: KeyboardEvent): void {
    const total = this.totalOpciones();
    if (evento.key === 'ArrowDown' && total > 0) {
      evento.preventDefault();
      this.abierto.set(true);
      this.activo.set((this.activo() + 1) % total);
    } else if (evento.key === 'ArrowUp' && total > 0) {
      evento.preventDefault();
      this.activo.set(this.activo() <= 0 ? total - 1 : this.activo() - 1);
    } else if (evento.key === 'Enter' && this.abierto() && this.activo() >= 0) {
      evento.preventDefault();
      const elegido = this.resultados()[this.activo()];
      if (elegido) this.elegirCentro(elegido);
      else this.pedirNuevo();
    } else if (evento.key === 'Escape') {
      this.abierto.set(false);
    }
  }

  protected elegirCentro(centro: CentroMedico): void {
    this.abierto.set(false);
    this.elegir.emit(centro);
  }

  protected pedirNuevo(): void {
    this.abierto.set(false);
    this.agregar.emit(this.texto().trim());
  }

  protected cambiar(): void {
    this.texto.set('');
    this.resultados.set([]);
    this.elegir.emit(null);
  }

  protected alSalir(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    if (!destino || !(evento.currentTarget as HTMLElement).contains(destino)) {
      this.abierto.set(false);
    }
  }
}
