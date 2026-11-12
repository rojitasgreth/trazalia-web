import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from '../../core/auth/auth-api';
import { AuthStore } from '../../core/auth/auth.store';
import type { SesionPropia } from '../../core/auth/auth.model';

/** A16 · Mi cuenta: resumen de perfil, atajo de recuperación y gestión de sesiones propias (BR-030). */
@Component({
  selector: 'app-pagina-mi-cuenta',
  imports: [DatePipe],
  template: `
    <section class="panel">
      <h1>Mi cuenta</h1>

      @if (usuario(); as u) {
        <section class="tarjeta">
          <h2>Perfil</h2>
          <dl>
            <dt>Nombre</dt>
            <dd>{{ u.nombre }} {{ u.apellido }}</dd>
            <dt>Correo</dt>
            <dd>{{ u.correo }}</dd>
            <dt>Usuario</dt>
            <dd>{{ u.nombreUsuario }}</dd>
            <dt>Rol</dt>
            <dd>{{ u.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Fisioterapeuta' }}</dd>
          </dl>
        </section>

        <section class="tarjeta">
          <h2>Contraseña</h2>
          <p>¿Quieres cambiar tu contraseña? Te enviamos un enlace a tu correo.</p>
          <button
            type="button"
            class="boton-secundario"
            [disabled]="enviandoEnlace()"
            (click)="enviarEnlace(u.correo)"
          >
            Enviarme el enlace
          </button>
          @if (mensajeEnlace()) {
            <p class="confirmacion" role="status">{{ mensajeEnlace() }}</p>
          }
        </section>
      }

      <section class="tarjeta">
        <h2>Sesiones activas</h2>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        @if (sesiones() === null) {
          <p role="status">Cargando…</p>
        } @else {
          <ul class="sesiones">
            @for (sesion of sesiones(); track sesion.idSesion) {
              <li>
                <div>
                  <p class="dispositivo">
                    {{ sesion.etiquetaDispositivo ?? 'Dispositivo desconocido' }}
                  </p>
                  <p class="meta">Última actividad: {{ sesion.ultimaActividad | date: 'short' }}</p>
                </div>
                <button type="button" class="boton-enlace" (click)="cerrarUna(sesion.idSesion)">
                  Cerrar
                </button>
              </li>
            }
          </ul>

          <button type="button" class="boton-secundario" (click)="cerrarTodas()">
            Cerrar sesión en todos los dispositivos
          </button>
        }
      </section>

      <button type="button" class="boton-enlace" (click)="cerrarSesion()">Cerrar sesión</button>
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: min(100%, 640px);
      margin: 32px auto;
      padding: 0 24px;
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
    }
    h2 {
      margin: 0;
      font-size: var(--texto-m);
    }
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 16px;
      margin: 0;
    }
    dt {
      color: var(--color-texto-secundario);
      font-size: var(--texto-s);
    }
    dd {
      margin: 0;
      font-size: var(--texto-s);
    }
    p {
      margin: 0;
      font-size: var(--texto-s);
      color: var(--color-texto-medio);
    }
    .boton-secundario {
      align-self: flex-start;
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
      opacity: 0.6;
      cursor: not-allowed;
    }
    .boton-enlace {
      align-self: flex-start;
      border: none;
      background: none;
      padding: 0;
      color: var(--color-primario);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .confirmacion {
      color: var(--color-exito);
    }
    .error {
      color: var(--color-aviso);
    }
    .sesiones {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sesiones li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--color-borde-suave);
    }
    .sesiones li:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .dispositivo {
      color: var(--color-texto);
      font-weight: 600;
    }
    .meta {
      font-size: var(--texto-xs);
    }
  `,
})
export class PaginaMiCuenta {
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly usuario = this.authStore.usuarioActual;
  protected readonly sesiones = signal<SesionPropia[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly enviandoEnlace = signal(false);
  protected readonly mensajeEnlace = signal<string | null>(null);

  constructor() {
    this.cargarSesiones();
  }

  protected enviarEnlace(correo: string): void {
    this.enviandoEnlace.set(true);
    this.mensajeEnlace.set(null);
    this.authApi.solicitarRecuperacion(correo).subscribe({
      complete: () => {
        this.enviandoEnlace.set(false);
        this.mensajeEnlace.set('Si la cuenta existe, se envió un enlace a tu correo.');
      },
      error: () => {
        this.enviandoEnlace.set(false);
        this.mensajeEnlace.set('Si la cuenta existe, se envió un enlace a tu correo.');
      },
    });
  }

  protected cerrarUna(idSesion: string): void {
    this.authApi.cerrarSesionPropia(idSesion).subscribe({
      complete: () => this.cargarSesiones(),
      error: () => this.cargarSesiones(),
    });
  }

  protected cerrarTodas(): void {
    this.authApi.cerrarSesiones().subscribe({
      complete: () => this.finalizarSesion(),
      error: () => this.finalizarSesion(),
    });
  }

  protected cerrarSesion(): void {
    this.authApi.cerrarSesion().subscribe({
      complete: () => this.finalizarSesion(),
      error: () => this.finalizarSesion(),
    });
  }

  private cargarSesiones(): void {
    this.error.set(null);
    this.authApi.sesiones().subscribe({
      next: (respuesta) => this.sesiones.set(respuesta.data),
      error: () => this.error.set('No se pudieron cargar las sesiones.'),
    });
  }

  private finalizarSesion(): void {
    this.authStore.limpiar();
    void this.router.navigate(['/iniciar-sesion']);
  }
}
