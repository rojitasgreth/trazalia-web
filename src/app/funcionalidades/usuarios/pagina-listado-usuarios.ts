import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsuariosApi } from '../../core/admin/usuarios-api';
import type { EstadoCuenta, PaginaUsuarios } from '../../core/admin/usuarios.model';
import type { RolUsuario } from '../../core/auth/auth.model';

const POR_PAGINA = 20;

const ETIQUETAS_ESTADO: Record<EstadoCuenta, string> = {
  PENDIENTE: 'Pendiente',
  ACTIVO: 'Activo',
  BLOQUEADO: 'Bloqueado',
  SUSPENDIDO: 'Suspendido',
  INACTIVO: 'Inactivo',
};

/** A13 · Listado de usuarios, con filtros y paginación. */
@Component({
  selector: 'app-pagina-listado-usuarios',
  imports: [RouterLink],
  template: `
    <section class="panel">
      <div class="cabecera">
        <h1>Usuarios</h1>
        <a routerLink="/usuarios/nuevo" class="boton-primario">+ Nuevo usuario</a>
      </div>

      <form class="filtros" (ngSubmit)="aplicarFiltros()">
        <input
          type="search"
          placeholder="Buscar por nombre, correo, cédula…"
          [value]="filtroTexto()"
          (input)="filtroTexto.set($any($event.target).value)"
          aria-label="Buscar usuarios"
        />
        <select
          [value]="filtroRol()"
          (change)="filtroRol.set($any($event.target).value)"
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
        </select>
        <select
          [value]="filtroEstado()"
          (change)="filtroEstado.set($any($event.target).value)"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          @for (estado of estados; track estado) {
            <option [value]="estado">{{ etiquetaEstado(estado) }}</option>
          }
        </select>
        <button type="submit" class="boton-secundario">Filtrar</button>
      </form>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (cargando()) {
        <p role="status">Cargando…</p>
      } @else if (resultado() && resultado()!.datos.length === 0) {
        <p role="status">No se encontraron usuarios.</p>
      } @else if (resultado()) {
        <table>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Correo</th>
              <th scope="col">Usuario</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (usuario of resultado()!.datos; track usuario.idUsuario) {
              <tr>
                <td>
                  <a [routerLink]="['/usuarios', usuario.idUsuario]"
                    >{{ usuario.nombre }} {{ usuario.apellido }}</a
                  >
                </td>
                <td>{{ usuario.correo }}</td>
                <td>{{ usuario.nombreUsuario }}</td>
                <td>{{ usuario.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Fisioterapeuta' }}</td>
                <td>
                  <span class="insignia" [attr.data-estado]="usuario.estado">
                    {{ etiquetaEstado(usuario.estado) }}
                  </span>
                </td>
              </tr>
            }
          </tbody>
        </table>

        <div class="paginacion">
          <button
            type="button"
            class="boton-secundario"
            [disabled]="pagina() <= 1"
            (click)="cambiarPagina(-1)"
          >
            Anterior
          </button>
          <span>Página {{ pagina() }} de {{ totalPaginas() }}</span>
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
      width: min(100%, 960px);
      margin: 32px auto;
      padding: 24px;
    }
    .cabecera {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    .filtros {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    input[type='search'] {
      flex: 1;
      min-width: 220px;
    }
    input,
    select {
      padding: 9px 10px;
      font: inherit;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
    }
    .boton-primario,
    .boton-secundario {
      padding: 9px 16px;
      border-radius: var(--radio-control);
      border: 1px solid transparent;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .boton-primario {
      background: var(--color-primario);
      color: var(--color-sobre-primario);
    }
    .boton-primario:hover {
      background: var(--color-primario-hover);
    }
    .boton-secundario {
      background: var(--color-superficie);
      border-color: var(--color-borde);
      color: var(--color-texto);
    }
    .boton-secundario:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-superficie);
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      overflow: hidden;
    }
    th,
    td {
      text-align: left;
      padding: 10px 12px;
      font-size: var(--texto-s);
      border-bottom: 1px solid var(--color-borde-suave);
    }
    th {
      color: var(--color-texto-secundario);
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .insignia {
      display: inline-flex;
      padding: 3px 10px;
      border-radius: var(--radio-pildora);
      font-size: var(--texto-xs);
      font-weight: 600;
      background: var(--color-superficie-sutil);
      color: var(--color-texto-medio);
    }
    .insignia[data-estado='ACTIVO'] {
      background: var(--color-exito-fondo);
      color: var(--color-exito);
    }
    .insignia[data-estado='PENDIENTE'] {
      background: var(--color-info-fondo);
      color: var(--color-info);
    }
    .insignia[data-estado='SUSPENDIDO'],
    .insignia[data-estado='BLOQUEADO'] {
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
    .error {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radio-control);
      background: var(--color-aviso-fondo);
      border: 1px solid var(--color-aviso-borde);
      color: var(--color-aviso);
      font-size: var(--texto-s);
    }
  `,
})
export class PaginaListadoUsuarios {
  private readonly api = inject(UsuariosApi);

  protected readonly estados: EstadoCuenta[] = Object.keys(ETIQUETAS_ESTADO) as EstadoCuenta[];

  protected readonly filtroTexto = signal('');
  protected readonly filtroRol = signal<RolUsuario | ''>('');
  protected readonly filtroEstado = signal<EstadoCuenta | ''>('');
  protected readonly pagina = signal(1);

  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<PaginaUsuarios | null>(null);

  protected readonly totalPaginas = () =>
    Math.max(1, Math.ceil((this.resultado()?.total ?? 0) / POR_PAGINA));

  constructor() {
    this.cargar();
  }

  protected etiquetaEstado(estado: EstadoCuenta): string {
    return ETIQUETAS_ESTADO[estado];
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
        texto: this.filtroTexto() || undefined,
        rol: this.filtroRol() || undefined,
        estado: this.filtroEstado() || undefined,
        pagina: this.pagina(),
        porPagina: POR_PAGINA,
      })
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la lista de usuarios.');
          this.cargando.set(false);
        },
      });
  }
}
