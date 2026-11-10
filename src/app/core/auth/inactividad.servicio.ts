import { Service, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth.store';

const ADVERTENCIA_MS = 55 * 60 * 1000;
const EXPIRA_MS = 60 * 60 * 1000;
const VENTANA_RESPUESTA_MS = EXPIRA_MS - ADVERTENCIA_MS;
const SENAL_MIN_INTERVALO_MS = 2 * 60 * 1000;

/**
 * Temporizador de inactividad del lado cliente (BR-022/023). El servidor es
 * la autoridad final (AC-021): esto solo decide cuándo mostrar el aviso y
 * cuándo cerrar la sesión por elección del usuario o por no responder.
 */
@Service()
export class InactividadServicio {
  private readonly api = inject(AuthApi);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly mostrarAdvertencia = signal(false);
  readonly segundosRestantes = signal(0);

  private temporizadorAdvertencia?: ReturnType<typeof setTimeout>;
  private temporizadorExpiracion?: ReturnType<typeof setTimeout>;
  private intervaloCuentaRegresiva?: ReturnType<typeof setInterval>;
  private ultimaSenalEnviada = 0;
  private activo = false;

  iniciar(): void {
    this.activo = true;
    this.reprogramar();
  }

  detener(): void {
    this.activo = false;
    clearTimeout(this.temporizadorAdvertencia);
    clearTimeout(this.temporizadorExpiracion);
    clearInterval(this.intervaloCuentaRegresiva);
    this.mostrarAdvertencia.set(false);
  }

  /** Señal explícita de interacción humana (BR-036), máximo una vez cada 2 min. */
  registrarActividadUsuario(): void {
    if (!this.activo || this.mostrarAdvertencia()) {
      return;
    }
    const ahora = Date.now();
    if (ahora - this.ultimaSenalEnviada < SENAL_MIN_INTERVALO_MS) {
      return;
    }
    this.ultimaSenalEnviada = ahora;
    this.api.registrarActividad().subscribe({
      next: () => this.reprogramar(),
      error: () => undefined,
    });
  }

  /** El usuario elige continuar durante el aviso (BR-024). */
  continuar(): void {
    this.api.registrarActividad().subscribe({
      next: () => this.reprogramar(),
      error: () => this.expirar(),
    });
  }

  /** El usuario elige cerrar sesión durante el aviso, o la cierra manualmente. */
  cerrarPorEleccion(): void {
    this.expirar();
  }

  private reprogramar(): void {
    clearTimeout(this.temporizadorAdvertencia);
    clearTimeout(this.temporizadorExpiracion);
    clearInterval(this.intervaloCuentaRegresiva);
    this.mostrarAdvertencia.set(false);
    this.temporizadorAdvertencia = setTimeout(() => this.mostrarAviso(), ADVERTENCIA_MS);
  }

  private mostrarAviso(): void {
    this.mostrarAdvertencia.set(true);
    const limite = Date.now() + VENTANA_RESPUESTA_MS;
    this.actualizarCuentaRegresiva(limite);
    this.intervaloCuentaRegresiva = setInterval(() => this.actualizarCuentaRegresiva(limite), 1000);
    this.temporizadorExpiracion = setTimeout(() => this.expirar(), VENTANA_RESPUESTA_MS);
  }

  private actualizarCuentaRegresiva(limite: number): void {
    this.segundosRestantes.set(Math.max(0, Math.round((limite - Date.now()) / 1000)));
  }

  private expirar(): void {
    this.detener();
    this.api.cerrarSesion().subscribe({
      complete: () => this.finalizar(),
      error: () => this.finalizar(),
    });
  }

  private finalizar(): void {
    this.store.limpiar();
    void this.router.navigate(['/iniciar-sesion']);
  }
}
