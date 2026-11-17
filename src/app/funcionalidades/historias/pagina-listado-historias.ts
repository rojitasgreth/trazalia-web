import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HistoriasApi } from '../../core/historias/historias-api';
import type {
  EstadoHistoria,
  HistoriaResumen,
  TipoHistoria,
} from '../../core/historias/historias.model';
import {
  ORDEN_TIPOS,
  TIPOS,
  etiquetaEstado,
  formatearDocumento,
  formatearFecha,
  formatearMomento,
} from './compartido/presentacion';

const POR_PAGINA = 20;
const ESPERA_BUSQUEDA_MS = 300;

/** B01–B05 · Listado de historias clínicas del fisioterapeuta (SPEC §12). */
@Component({
  selector: 'app-pagina-listado-historias',
  imports: [RouterLink],
  template: `
    <div class="pagina">
      <header class="cabecera">
        <div class="titulos">
          <h1>Historias clínicas</h1>
          <p>Solo ves las historias que tú creaste.</p>
        </div>
        <a
          routerLink="/historias/nueva"
          class="hc-boton"
          data-variante="primario"
          data-tamano="compacto"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Crear nueva historia
        </a>
      </header>

      <nav class="pestanas" aria-label="Vistas de historias">
        <a
          routerLink="/historias"
          [attr.aria-current]="archivadas() ? null : 'page'"
          [class.activa]="!archivadas()"
        >
          Historias <span class="contador">{{ conteos().historias }}</span>
        </a>
        <a
          routerLink="/historias"
          [queryParams]="{ vista: 'archivadas' }"
          [attr.aria-current]="archivadas() ? 'page' : null"
          [class.activa]="archivadas()"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="5" rx="1" />
            <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" />
          </svg>
          Archivadas <span class="contador">{{ conteos().archivadas }}</span>
        </a>
      </nav>

      @if (!sinHistorias()) {
        <div class="filtros" role="search">
          <div class="campo campo--busqueda">
            <label for="buscar">Buscar</label>
            <div class="con-icono">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                id="buscar"
                type="search"
                placeholder="Nombre, apellido o cédula"
                [value]="textoEscrito()"
                (input)="escribirTexto($any($event.target).value)"
              />
            </div>
          </div>
          <div class="campo">
            <label for="filtro-tipo">Tipo</label>
            <select
              id="filtro-tipo"
              [value]="tipo()"
              (change)="cambiarTipo($any($event.target).value)"
            >
              <option value="">Todos los tipos</option>
              @for (t of tipos; track t) {
                <option [value]="t">{{ nombreTipo(t) }}</option>
              }
            </select>
          </div>
          @if (!archivadas()) {
            <div class="campo">
              <label for="filtro-estado">Estado</label>
              <select
                id="filtro-estado"
                [value]="estado()"
                (change)="cambiarEstado($any($event.target).value)"
              >
                <option value="">Todos</option>
                <option value="BORRADOR">Borrador</option>
                <option value="ACTIVA">Activa</option>
              </select>
            </div>
          }
          <fieldset class="campo rango">
            <legend>Creada entre</legend>
            <div class="rango-fechas">
              <input
                type="date"
                aria-label="Creada desde"
                [value]="desde()"
                (change)="cambiarDesde($any($event.target).value)"
              />
              <input
                type="date"
                aria-label="Creada hasta"
                [value]="hasta()"
                (change)="cambiarHasta($any($event.target).value)"
              />
            </div>
          </fieldset>
        </div>
      }

      @if (pagina.error()) {
        <p class="error" role="alert">No se pudieron cargar las historias. Inténtalo de nuevo.</p>
      } @else if (pagina.isLoading() && !pagina.hasValue()) {
        <p role="status">Cargando…</p>
      } @else if (filas().length > 0) {
        @if (archivadas()) {
          <p class="nota-archivadas">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8v.5" />
            </svg>
            Las historias archivadas tienen registros clínicos y no se pueden eliminar. Son de solo
            lectura hasta que las desarchives.
          </p>
        }

        <section class="tabla-contenedor" aria-label="Historias">
          <table>
            <thead>
              <tr>
                <th scope="col">Paciente</th>
                <th scope="col">Documento</th>
                <th scope="col">Tipo de historia</th>
                <th scope="col">Estado</th>
                <th scope="col">Última actualización</th>
                <th scope="col">Teléfono</th>
                <th scope="col">Nacimiento</th>
                <th scope="col"><span class="hc-solo-lector">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              @for (h of filas(); track h.idHistoria) {
                <tr>
                  <td class="nowrap">
                    <a class="nombre" [routerLink]="['/historias', h.idHistoria]"
                      >{{ h.nombre }} {{ h.apellido }}</a
                    >
                  </td>
                  <td class="nowrap numerico" [class.sin-documento]="!h.cedula">
                    {{ documento(h) }}
                  </td>
                  <td>
                    <span class="tipo"
                      ><span class="hc-punto" [attr.data-tipo]="h.tipo"></span
                      >{{ nombreTipo(h.tipo) }}</span
                    >
                  </td>
                  <td>
                    <span class="hc-chip" [attr.data-estado]="claveEstado(h)">{{
                      estadoDe(h)
                    }}</span>
                  </td>
                  <td class="nowrap secundario">{{ momento(h.fechaActualizacion) }}</td>
                  <td class="nowrap secundario">{{ h.telefono }}</td>
                  <td class="nowrap secundario numerico">{{ fecha(h.fechaNacimiento) }}</td>
                  <td class="acciones">
                    @if (h.archivada) {
                      <button
                        type="button"
                        class="enlace-accion"
                        [disabled]="desarchivando() === h.idHistoria"
                        (click)="desarchivar(h)"
                      >
                        Desarchivar<span class="hc-solo-lector">
                          la historia de {{ h.nombre }} {{ h.apellido }}</span
                        >
                      </button>
                    }
                    <a [routerLink]="['/historias', h.idHistoria]"
                      >Abrir<span class="hc-solo-lector">
                        la historia de {{ h.nombre }} {{ h.apellido }}</span
                      ></a
                    >
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <ul class="tarjetas" aria-label="Historias">
          @for (h of filas(); track h.idHistoria) {
            <li>
              <a class="tarjeta" [routerLink]="['/historias', h.idHistoria]">
                <span class="tarjeta-cabecera">
                  <span class="tarjeta-nombre">{{ h.nombre }} {{ h.apellido }}</span>
                  <span class="hc-chip" [attr.data-estado]="claveEstado(h)">{{ estadoDe(h) }}</span>
                </span>
                <span class="secundario" [class.sin-documento]="!h.cedula">{{ documento(h) }}</span>
                <span class="tipo"
                  ><span class="hc-punto" [attr.data-tipo]="h.tipo"></span
                  >{{ nombreTipo(h.tipo) }}</span
                >
                <span class="tarjeta-datos">
                  <span>Teléfono {{ h.telefono || '—' }}</span>
                  <span>Nacimiento {{ fecha(h.fechaNacimiento) || '—' }}</span>
                  <span>Actualizada {{ momento(h.fechaActualizacion) }}</span>
                </span>
              </a>
            </li>
          }
        </ul>

        <div class="paginacion">
          <span>{{ textoPaginacion() }}</span>
          <nav aria-label="Paginación" class="paginas">
            <button
              type="button"
              [disabled]="paginaActual() <= 1"
              (click)="irAPagina(paginaActual() - 1)"
            >
              Anterior
            </button>
            <span class="pagina-actual" aria-current="page">{{ paginaActual() }}</span>
            <button
              type="button"
              [disabled]="paginaActual() >= totalPaginas()"
              (click)="irAPagina(paginaActual() + 1)"
            >
              Siguiente
            </button>
          </nav>
        </div>
      } @else if (pagina.hasValue()) {
        <section class="vacio" role="status">
          <div class="vacio-icono">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
              <path d="M14 3v5h5M12 11v6M9 14h6" />
            </svg>
          </div>
          @if (sinHistorias()) {
            <h2>Aún no tienes historias clínicas</h2>
            <p>
              Crea la primera eligiendo el tipo de historia. Puedes guardarla como borrador y
              completar los datos después.
            </p>
            <a
              routerLink="/historias/nueva"
              class="hc-boton"
              data-variante="primario"
              data-tamano="compacto"
              >Crear nueva historia</a
            >
          } @else if (archivadas() && !hayFiltros()) {
            <h2>No tienes historias archivadas</h2>
            <p>Aquí aparecerán las historias que archives.</p>
          } @else {
            <h2>
              {{
                textoBuscado() ? 'Sin resultados para "' + textoBuscado() + '"' : 'Sin resultados'
              }}
            </h2>
            <p>
              Revisa la ortografía o busca por número de cédula. Los filtros de tipo, estado y fecha
              también limitan los resultados.
            </p>
            <button
              type="button"
              class="hc-boton"
              data-variante="secundario"
              data-tamano="compacto"
              (click)="limpiarFiltros()"
            >
              Limpiar búsqueda y filtros
            </button>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .pagina {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 32px;
    }
    .cabecera {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .titulos {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
      font-weight: 700;
    }
    .titulos p {
      margin: 0;
      color: var(--color-texto-secundario);
    }
    .pestanas {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--color-borde-suave);
    }
    .pestanas a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 0 12px;
      margin-bottom: -1px;
      border-bottom: 3px solid transparent;
      color: var(--color-texto-medio);
      text-decoration: none;
    }
    .pestanas a.activa {
      border-bottom-color: var(--color-primario);
      color: var(--color-primario-hover);
      font-weight: 700;
    }
    .contador {
      padding: 2px 8px;
      border-radius: var(--radio-pildora);
      background: var(--color-superficie-sutil);
      color: var(--color-texto-medio);
      font-size: 12px;
      font-weight: 700;
    }
    .filtros {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;
      align-items: end;
    }
    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .campo--busqueda {
      grid-column: span 2;
    }
    .campo label,
    .campo legend {
      padding: 0;
      font-size: var(--texto-xs);
      font-weight: 600;
    }
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }
    .rango legend {
      margin-bottom: 6px;
    }
    .rango-fechas {
      display: flex;
      gap: 6px;
    }
    input,
    select {
      width: 100%;
      min-width: 0;
      height: 44px;
      padding: 0 10px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
    }
    .con-icono {
      position: relative;
    }
    .con-icono svg {
      position: absolute;
      left: 14px;
      top: 13px;
      color: var(--color-texto-secundario);
    }
    .con-icono input {
      padding-left: 40px;
    }
    .nota-archivadas {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin: 0;
      padding: 12px 14px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
      color: var(--color-texto-medio);
      font-size: var(--texto-s);
      line-height: 1.5;
    }
    .nota-archivadas svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .tabla-contenedor {
      overflow-x: auto;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    table {
      width: 100%;
      min-width: 980px;
      border-collapse: collapse;
    }
    th {
      padding: 14px 12px;
      border-bottom: 1px solid var(--color-borde-suave);
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
      font-weight: 600;
      text-align: left;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid var(--color-superficie-sutil);
    }
    .nowrap {
      white-space: nowrap;
    }
    .numerico {
      font-variant-numeric: tabular-nums;
    }
    .secundario {
      color: var(--color-texto-medio);
    }
    .sin-documento {
      color: var(--color-texto-secundario);
      font-style: italic;
    }
    .nombre {
      color: var(--color-texto);
      font-weight: 700;
      text-decoration: none;
    }
    .nombre:hover {
      text-decoration: underline;
    }
    .acciones {
      text-align: right;
      white-space: nowrap;
    }
    .enlace-accion {
      margin-right: 12px;
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-primario);
      font: inherit;
      font-size: var(--texto-s);
      font-weight: 600;
      cursor: pointer;
    }
    .acciones a {
      font-size: var(--texto-s);
      font-weight: 600;
      text-decoration: none;
    }
    .tipo {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tarjetas {
      display: none;
      flex-direction: column;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
      color: var(--color-texto);
      text-decoration: none;
    }
    .tarjeta-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .tarjeta-nombre {
      font-size: var(--texto-l);
      font-weight: 700;
    }
    .tarjeta-datos {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 14px;
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
    }
    .paginacion {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      color: var(--color-texto-medio);
      font-size: var(--texto-s);
    }
    .paginas {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .paginas button {
      height: 40px;
      padding: 0 14px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .paginas button:disabled {
      border-color: var(--color-borde-suave);
      color: var(--color-texto-apagado);
      cursor: not-allowed;
    }
    .pagina-actual {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radio-control);
      background: var(--color-texto);
      color: var(--color-superficie);
      font-weight: 700;
    }
    .vacio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      padding: 56px 24px;
      border: 1px dashed var(--color-borde-neutro);
      border-radius: 18px;
      background: var(--color-superficie);
      text-align: center;
    }
    .vacio-icono {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 22px;
      background: var(--color-primario-suave);
      color: var(--color-primario);
    }
    .vacio h2 {
      margin: 0;
      font-size: 22px;
    }
    .vacio p {
      max-width: 440px;
      margin: 0;
      color: var(--color-texto-medio);
      line-height: 1.55;
    }
    .error {
      margin: 0;
      padding: 12px 14px;
      border: 1px solid var(--color-peligro-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-peligro-fondo);
      color: var(--color-peligro);
    }
    /* B02: en móvil la tabla se sustituye por tarjetas. */
    @media (max-width: 720px) {
      .pagina {
        padding: 20px 16px;
      }
      .campo--busqueda {
        grid-column: 1 / -1;
      }
      .tabla-contenedor {
        display: none;
      }
      .tarjetas {
        display: flex;
      }
    }
  `,
})
export class PaginaListadoHistorias {
  private readonly api = inject(HistoriasApi);
  private readonly ahora = new Date();
  private temporizadorBusqueda?: ReturnType<typeof setTimeout>;

  /** Query param `?vista=archivadas`: pestaña Archivadas (§12.4). */
  protected readonly archivadas = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((q) => q.get('vista') === 'archivadas')),
    { initialValue: false },
  );

  protected readonly tipos = ORDEN_TIPOS;
  protected readonly textoEscrito = signal('');
  protected readonly textoBuscado = signal('');
  protected readonly tipo = signal<TipoHistoria | ''>('');
  protected readonly estado = signal<EstadoHistoria | ''>('');
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  protected readonly paginaActual = signal(1);

  protected readonly pagina = rxResource({
    params: () => ({
      texto: this.textoBuscado() || undefined,
      tipo: this.tipo() || undefined,
      estado: this.archivadas() ? undefined : this.estado() || undefined,
      archivadas: this.archivadas(),
      creadaDesde: this.desde() || undefined,
      creadaHasta: this.hasta() || undefined,
      pagina: this.paginaActual(),
      porPagina: POR_PAGINA,
    }),
    stream: ({ params }) => this.api.listar(params),
  });

  protected readonly filas = computed<HistoriaResumen[]>(() =>
    this.pagina.hasValue() ? this.pagina.value().datos : [],
  );
  protected readonly conteos = computed(() =>
    this.pagina.hasValue() ? this.pagina.value().conteos : { historias: 0, archivadas: 0 },
  );
  protected readonly hayFiltros = computed(
    () => !!(this.textoBuscado() || this.tipo() || this.estado() || this.desde() || this.hasta()),
  );
  /** B03: el fisioterapeuta todavía no tiene ninguna historia. */
  protected readonly sinHistorias = computed(
    () =>
      this.pagina.hasValue() &&
      !this.archivadas() &&
      this.conteos().historias === 0 &&
      this.conteos().archivadas === 0,
  );
  protected readonly totalPaginas = computed(() =>
    this.pagina.hasValue() ? Math.max(1, Math.ceil(this.pagina.value().total / POR_PAGINA)) : 1,
  );
  protected readonly textoPaginacion = computed(() => {
    if (!this.pagina.hasValue()) return '';
    const { total } = this.pagina.value();
    const inicio = (this.paginaActual() - 1) * POR_PAGINA + 1;
    const fin = inicio + this.filas().length - 1;
    const sufijo = this.archivadas() ? 'historias archivadas' : 'historias';
    return `Mostrando ${inicio}–${fin} de ${total} ${sufijo}`;
  });

  protected escribirTexto(valor: string): void {
    this.textoEscrito.set(valor);
    clearTimeout(this.temporizadorBusqueda);
    this.temporizadorBusqueda = setTimeout(() => {
      this.paginaActual.set(1);
      this.textoBuscado.set(valor.trim());
    }, ESPERA_BUSQUEDA_MS);
  }

  protected cambiarTipo(valor: TipoHistoria | ''): void {
    this.paginaActual.set(1);
    this.tipo.set(valor);
  }

  protected cambiarEstado(valor: EstadoHistoria | ''): void {
    this.paginaActual.set(1);
    this.estado.set(valor);
  }

  protected cambiarDesde(valor: string): void {
    this.paginaActual.set(1);
    this.desde.set(valor);
  }

  protected cambiarHasta(valor: string): void {
    this.paginaActual.set(1);
    this.hasta.set(valor);
  }

  /** B05 / AC-014: desarchivar desde el apartado de Archivadas. */
  protected readonly desarchivando = signal<string | null>(null);

  protected desarchivar(h: HistoriaResumen): void {
    this.desarchivando.set(h.idHistoria);
    this.api.desarchivar(h.idHistoria).subscribe({
      next: () => {
        this.desarchivando.set(null);
        this.pagina.reload();
      },
      error: () => this.desarchivando.set(null),
    });
  }

  protected irAPagina(numero: number): void {
    this.paginaActual.set(numero);
  }

  protected limpiarFiltros(): void {
    clearTimeout(this.temporizadorBusqueda);
    this.textoEscrito.set('');
    this.textoBuscado.set('');
    this.tipo.set('');
    this.estado.set('');
    this.desde.set('');
    this.hasta.set('');
    this.paginaActual.set(1);
  }

  protected nombreTipo(tipo: TipoHistoria): string {
    return TIPOS[tipo].nombre;
  }

  protected estadoDe(h: HistoriaResumen): string {
    return etiquetaEstado(h.estado, h.archivada);
  }

  protected claveEstado(h: HistoriaResumen): string {
    return etiquetaEstado(h.estado, h.archivada).toLowerCase();
  }

  protected documento(h: HistoriaResumen): string {
    return formatearDocumento(h);
  }

  protected fecha(iso: string | null): string {
    return formatearFecha(iso);
  }

  protected momento(iso: string): string {
    return formatearMomento(iso, this.ahora);
  }
}
