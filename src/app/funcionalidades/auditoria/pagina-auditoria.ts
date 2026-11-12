import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuditoriaApi } from '../../core/auditoria/auditoria-api';
import type { EventoAuditoria, PaginaEventosAuditoria } from '../../core/auditoria/auditoria.model';

const POR_PAGINA = 20;

const ETIQUETAS_RESULTADO: Record<string, string> = {
  EXITOSO: 'Exitoso',
  FALLIDO: 'Fallido',
  DENEGADO: 'Denegado',
  REUTILIZACION_DETECTADA: 'Reutilización detectada',
};

/**
 * A15 · Auditoría (solo administradores). El filtro "Usuario" del diseño
 * real busca por cédula o correo; el endpoint solo filtra por id interno,
 * así que por ahora se deja fuera de este formulario (ver detalle en el PR).
 */
@Component({
  selector: 'app-pagina-auditoria',
  imports: [DatePipe],
  template: `
    <section class="panel">
      <header>
        <h1>Auditoría</h1>
        <p class="ayuda">
          Registro de solo lectura de accesos y cambios de cuentas. Se conserva 6 meses. Nunca
          guarda contraseñas ni tokens.
        </p>
      </header>

      <div class="filtros">
        <div class="campo">
          <label for="f-tipo">Evento</label>
          <input
            id="f-tipo"
            type="text"
            placeholder="ej. inicio_sesion"
            [value]="filtroTipo()"
            (input)="filtroTipo.set($any($event.target).value)"
          />
        </div>
        <div class="campo">
          <label for="f-res">Resultado</label>
          <select
            id="f-res"
            [value]="filtroResultado()"
            (change)="filtroResultado.set($any($event.target).value)"
          >
            <option value="">Todos</option>
            @for (resultado of resultados; track resultado) {
              <option [value]="resultado">{{ etiquetaResultado(resultado) }}</option>
            }
          </select>
        </div>
        <div class="campo">
          <label for="f-desde">Desde</label>
          <input
            id="f-desde"
            type="date"
            [value]="filtroDesde()"
            (input)="filtroDesde.set($any($event.target).value)"
          />
        </div>
        <div class="campo">
          <label for="f-hasta">Hasta</label>
          <input
            id="f-hasta"
            type="date"
            [value]="filtroHasta()"
            (input)="filtroHasta.set($any($event.target).value)"
          />
        </div>
        <button type="button" class="boton-secundario" (click)="aplicarFiltros()">Filtrar</button>
      </div>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (cargando()) {
        <p role="status">Cargando…</p>
      } @else if (resultado() && resultado()!.datos.length === 0) {
        <p role="status">No se encontraron eventos.</p>
      } @else if (resultado()) {
        <section class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Evento</th>
                <th scope="col">Actor</th>
                <th scope="col">Usuario afectado</th>
                <th scope="col">Resultado</th>
                <th scope="col">Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (evento of resultado()!.datos; track evento.idEvento) {
                <tr>
                  <td>{{ evento.fechaEvento | date: 'short' }}</td>
                  <td>{{ evento.tipoEvento }}</td>
                  <td>{{ truncarId(evento.idUsuarioActor) }}</td>
                  <td>{{ truncarId(evento.idUsuarioAfectado) }}</td>
                  <td>
                    <span class="insignia" [attr.data-resultado]="evento.resultado">
                      {{ etiquetaResultado(evento.resultado) }}
                    </span>
                  </td>
                  <td class="detalle">{{ detalle(evento) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>

        <div class="paginacion">
          <button
            type="button"
            class="boton-secundario"
            [disabled]="pagina() <= 1"
            (click)="cambiarPagina(-1)"
          >
            Anterior
          </button>
          <span>Mostrando página {{ pagina() }} de {{ totalPaginas() }}</span>
          <button
            type="button"
            class="boton-secundario"
            [disabled]="pagina() >= totalPaginas()"
            (click)="cambiarPagina(1)"
          >
            Siguiente
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(100%, 1000px);
      margin: 32px auto;
      padding: 0 24px;
    }
    header {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    .ayuda {
      margin: 0;
      font-size: var(--texto-s);
      color: var(--color-texto-secundario);
    }
    .filtros {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      align-items: end;
    }
    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: var(--texto-xs);
      font-weight: 600;
      color: var(--color-texto-medio);
    }
    input,
    select {
      height: 40px;
      padding: 0 10px;
      font: inherit;
      font-size: var(--texto-s);
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
    }
    .boton-secundario {
      height: 40px;
      padding: 0 16px;
      border-radius: var(--radio-control);
      border: 1px solid var(--color-borde);
      background: var(--color-superficie);
      font: inherit;
      font-size: var(--texto-s);
      font-weight: 600;
      color: var(--color-texto);
      cursor: pointer;
    }
    .boton-secundario:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .error {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radio-control);
      background: var(--color-aviso-fondo);
      border: 1px solid var(--color-aviso-borde);
      color: var(--color-aviso);
      font-size: var(--texto-s);
    }
    .tabla-contenedor {
      background: var(--color-superficie);
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
      font-size: var(--texto-s);
    }
    th,
    td {
      text-align: left;
      padding: 10px 14px;
      border-bottom: 1px solid var(--color-borde-suave);
      white-space: nowrap;
    }
    th {
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .detalle {
      max-width: 320px;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--color-texto-medio);
    }
    .insignia {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: var(--radio-pildora);
      font-size: var(--texto-xs);
      font-weight: 700;
      background: var(--color-superficie-sutil);
      color: var(--color-texto-medio);
    }
    .insignia[data-resultado='EXITOSO'] {
      background: var(--color-exito-fondo);
      color: var(--color-exito);
    }
    .insignia[data-resultado='FALLIDO'],
    .insignia[data-resultado='DENEGADO'] {
      background: var(--color-aviso-fondo);
      color: var(--color-aviso);
    }
    .paginacion {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      font-size: var(--texto-s);
      color: var(--color-texto-medio);
    }
  `,
})
export class PaginaAuditoria {
  private readonly api = inject(AuditoriaApi);

  protected readonly resultados = Object.keys(ETIQUETAS_RESULTADO);

  protected readonly filtroTipo = signal('');
  protected readonly filtroResultado = signal('');
  protected readonly filtroDesde = signal('');
  protected readonly filtroHasta = signal('');
  protected readonly pagina = signal(1);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<PaginaEventosAuditoria | null>(null);

  protected readonly totalPaginas = () =>
    Math.max(1, Math.ceil((this.resultado()?.total ?? 0) / POR_PAGINA));

  constructor() {
    this.cargar();
  }

  protected etiquetaResultado(resultado: string): string {
    return ETIQUETAS_RESULTADO[resultado] ?? resultado;
  }

  protected truncarId(id: string | null): string {
    return id ? id.slice(0, 8) : '—';
  }

  protected detalle(evento: EventoAuditoria): string {
    return evento.metadatosMinimos ? JSON.stringify(evento.metadatosMinimos) : '—';
  }

  protected aplicarFiltros(): void {
    this.pagina.set(1);
    this.cargar();
  }

  protected cambiarPagina(delta: number): void {
    this.pagina.update((actual) => actual + delta);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.api
      .listar({
        tipoEvento: this.filtroTipo() || undefined,
        resultado: this.filtroResultado() || undefined,
        desde: this.filtroDesde() ? `${this.filtroDesde()}T00:00:00Z` : undefined,
        hasta: this.filtroHasta() ? `${this.filtroHasta()}T23:59:59Z` : undefined,
        pagina: this.pagina(),
        porPagina: POR_PAGINA,
      })
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la auditoría.');
          this.cargando.set(false);
        },
      });
  }
}
