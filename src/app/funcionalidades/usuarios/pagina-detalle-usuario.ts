import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';
import { UsuariosApi } from '../../core/admin/usuarios-api';
import type { UsuarioAdministrado } from '../../core/admin/usuarios.model';
import { AuthStore } from '../../core/auth/auth.store';
import type { RolUsuario, SesionPropia } from '../../core/auth/auth.model';

/** A14 · Detalle y edición de un usuario administrado, con sus sesiones activas. */
@Component({
  selector: 'app-pagina-detalle-usuario',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    @if (cargando()) {
      <p role="status" class="estado-carga">Cargando…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (usuario()) {
      <section class="panel">
        <div class="cabecera">
          <h1>{{ usuario()!.nombre }} {{ usuario()!.apellido }}</h1>
          <span class="insignia" [attr.data-estado]="usuario()!.estado">{{
            usuario()!.estado
          }}</span>
        </div>

        <dl class="metadatos">
          <div>
            <dt>Nombre de usuario</dt>
            <dd>{{ usuario()!.nombreUsuario }}</dd>
          </div>
          <div>
            <dt>Cédula</dt>
            <dd>{{ usuario()!.nacionalidad }}-{{ usuario()!.cedula }}</dd>
          </div>
          <div>
            <dt>Último acceso</dt>
            <dd>{{ usuario()!.ultimoAcceso ?? 'Nunca' }}</dd>
          </div>
        </dl>

        @if (mensajeAccion()) {
          <p class="exito" role="status">{{ mensajeAccion() }}</p>
        }
        @if (errorAccion()) {
          <p class="error" role="alert">{{ errorAccion() }}</p>
        }

        <div class="acciones">
          @if (puedeSuspender()) {
            <button type="button" class="boton-secundario" (click)="suspender()">Suspender</button>
          }
          @if (puedeReactivar()) {
            <button type="button" class="boton-secundario" (click)="reactivar()">Reactivar</button>
          }
          @if (puedeReenviarInvitacion()) {
            <button type="button" class="boton-secundario" (click)="reenviarInvitacion()">
              Reenviar invitación
            </button>
          }
          @if (puedeDesbloquear()) {
            <button type="button" class="boton-secundario" (click)="desbloquear()">
              Desbloquear
            </button>
          }
          @if (puedeInactivar()) {
            <button type="button" class="boton-peligro" (click)="inactivar()">Inactivar</button>
          }
        </div>

        <form [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
          <div class="campo">
            <label for="nombre">Nombre</label>
            <input id="nombre" type="text" formControlName="nombre" />
          </div>
          <div class="campo">
            <label for="apellido">Apellido</label>
            <input id="apellido" type="text" formControlName="apellido" />
          </div>
          <div class="campo">
            <label for="correo">Correo</label>
            <input id="correo" type="email" formControlName="correo" />
          </div>
          <div class="campo">
            <label for="telefono">Teléfono</label>
            <input id="telefono" type="text" formControlName="telefono" />
          </div>
          <div class="campo">
            <label for="rol">Rol</label>
            <select id="rol" formControlName="rol">
              <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
            @if (esMiPropiaCuenta()) {
              <p class="ayuda">No puedes cambiar tu propio rol.</p>
            }
          </div>

          <div class="acciones">
            <a routerLink="/usuarios" class="boton-secundario">Volver</a>
            <button
              type="submit"
              class="boton-primario"
              [disabled]="formulario.invalid || guardando()"
            >
              @if (guardando()) {
                Guardando…
              } @else {
                Guardar cambios
              }
            </button>
          </div>
        </form>

        <h2>Sesiones activas</h2>
        @if (sesiones().length === 0) {
          <p>No tiene sesiones activas.</p>
        } @else {
          <ul class="sesiones">
            @for (sesion of sesiones(); track sesion.idSesion) {
              <li>
                <span>{{ sesion.etiquetaDispositivo ?? 'Dispositivo desconocido' }}</span>
                <button type="button" class="boton-enlace" (click)="cerrarSesion(sesion.idSesion)">
                  Cerrar
                </button>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: `
    .estado-carga {
      text-align: center;
      margin: 48px;
      color: var(--color-texto-secundario);
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: min(100%, 560px);
      margin: 32px auto;
      padding: 32px 24px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
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
    h2 {
      margin: 0;
      font-size: var(--texto-l);
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
    .metadatos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin: 0;
      font-size: var(--texto-s);
    }
    .metadatos dt {
      color: var(--color-texto-secundario);
    }
    .metadatos dd {
      margin: 0;
      font-weight: 600;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: var(--texto-s);
      font-weight: 600;
      color: var(--color-texto-medio);
    }
    .ayuda {
      margin: 0;
      font-size: var(--texto-xs);
      color: var(--color-texto-secundario);
    }
    input,
    select {
      padding: 10px 12px;
      font: inherit;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
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
    .exito {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radio-control);
      background: var(--color-exito-fondo);
      border: 1px solid var(--color-exito-borde);
      color: var(--color-exito);
      font-size: var(--texto-s);
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }
    .boton-primario,
    .boton-secundario,
    .boton-peligro {
      padding: 10px 16px;
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
    .boton-primario:hover:not(:disabled) {
      background: var(--color-primario-hover);
    }
    .boton-primario:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .boton-secundario {
      background: var(--color-superficie);
      border-color: var(--color-borde);
      color: var(--color-texto);
    }
    .boton-peligro {
      background: var(--color-superficie);
      border-color: var(--color-aviso-borde);
      color: var(--color-aviso);
    }
    .sesiones {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .sesiones li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-control);
      font-size: var(--texto-s);
    }
    .boton-enlace {
      border: none;
      background: none;
      padding: 0;
      color: var(--color-primario);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .boton-enlace:hover {
      color: var(--color-primario-hover);
    }
  `,
})
export class PaginaDetalleUsuario {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(UsuariosApi);
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  private readonly idUsuario = this.ruta.snapshot.paramMap.get('id')!;

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioAdministrado | null>(null);
  protected readonly sesiones = signal<SesionPropia[]>([]);
  protected readonly guardando = signal(false);
  protected readonly mensajeAccion = signal<string | null>(null);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly esMiPropiaCuenta = computed(
    () => this.idUsuario === this.authStore.usuarioActual()?.idUsuario,
  );

  protected readonly puedeSuspender = computed(
    () => this.usuario()?.estado === 'ACTIVO' && !this.esMiPropiaCuenta(),
  );
  protected readonly puedeReactivar = computed(
    () => this.usuario()?.estado === 'SUSPENDIDO' && this.usuario()?.fechaActivacion !== null,
  );
  protected readonly puedeReenviarInvitacion = computed(() => {
    const usuario = this.usuario();
    if (!usuario) return false;
    return (
      usuario.estado === 'PENDIENTE' ||
      (usuario.estado === 'SUSPENDIDO' && usuario.fechaActivacion === null)
    );
  });
  protected readonly puedeInactivar = computed(
    () => this.usuario()?.estado !== 'INACTIVO' && !this.esMiPropiaCuenta(),
  );
  protected readonly puedeDesbloquear = computed(() => this.usuario()?.estado === 'BLOQUEADO');

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    telefono: [''],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['FISIOTERAPEUTA' as RolUsuario, [Validators.required]],
  });

  constructor() {
    this.cargarUsuario();
    this.cargarSesiones();
  }

  protected guardar(): void {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }
    this.guardando.set(true);
    this.errorAccion.set(null);
    this.mensajeAccion.set(null);

    const valores = this.formulario.getRawValue();
    this.api
      .actualizar(this.idUsuario, { ...valores, telefono: valores.telefono || null })
      .subscribe({
        next: ({ usuario }) => {
          this.usuario.set(usuario);
          this.guardando.set(false);
          this.mensajeAccion.set('Cambios guardados.');
        },
        error: (error: unknown) => {
          this.guardando.set(false);
          this.errorAccion.set(this.mensajeDeError(error));
        },
      });
  }

  protected suspender(): void {
    this.ejecutarAccion(this.api.suspender(this.idUsuario), 'Usuario suspendido.');
  }

  protected reactivar(): void {
    this.ejecutarAccion(this.api.reactivar(this.idUsuario), 'Usuario reactivado.');
  }

  protected inactivar(): void {
    this.ejecutarAccion(this.api.inactivar(this.idUsuario), 'Usuario inactivado.');
  }

  protected reenviarInvitacion(): void {
    this.ejecutarAccion(this.api.reenviarInvitacion(this.idUsuario), 'Invitación reenviada.');
  }

  protected desbloquear(): void {
    this.ejecutarAccion(this.api.desbloquear(this.idUsuario), 'Usuario desbloqueado.');
  }

  protected cerrarSesion(idSesion: string): void {
    this.api.cerrarSesion(this.idUsuario, idSesion).subscribe({
      next: () => this.cargarSesiones(),
      error: () => this.errorAccion.set('No se pudo cerrar la sesión.'),
    });
  }

  private cargarUsuario(): void {
    this.cargando.set(true);
    this.api.obtener(this.idUsuario).subscribe({
      next: ({ usuario }) => {
        this.usuario.set(usuario);
        this.formulario.patchValue({
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          telefono: usuario.telefono ?? '',
          correo: usuario.correo,
          rol: usuario.rol,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el usuario.');
        this.cargando.set(false);
      },
    });
  }

  private cargarSesiones(): void {
    this.api.sesiones(this.idUsuario).subscribe({
      next: ({ data }) => this.sesiones.set(data),
      error: () => undefined,
    });
  }

  private ejecutarAccion(observable: Observable<{ estado: 'ok' }>, mensajeExito: string): void {
    this.errorAccion.set(null);
    this.mensajeAccion.set(null);
    observable.subscribe({
      next: () => {
        this.mensajeAccion.set(mensajeExito);
        this.cargarUsuario();
        this.cargarSesiones();
      },
      error: (error: unknown) => this.errorAccion.set(this.mensajeDeError(error)),
    });
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'No se pudo completar la acción.';
  }
}
