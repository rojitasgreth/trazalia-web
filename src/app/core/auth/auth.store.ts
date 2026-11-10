import { Service, computed, signal } from '@angular/core';
import type { UsuarioAutenticado } from './auth.model';

/**
 * Estado de sesión en memoria. No persiste nada en localStorage/sessionStorage
 * (Documento Cero §9, DP y spec §9.1): tras recargar la página se reconstruye
 * preguntando al servidor (ver core/auth/auth.guard.ts).
 */
@Service()
export class AuthStore {
  private readonly usuario = signal<UsuarioAutenticado | null>(null);
  private readonly inicializando = signal(true);

  readonly usuarioActual = this.usuario.asReadonly();
  readonly estaAutenticado = computed(() => this.usuario() !== null);
  readonly estaInicializando = this.inicializando.asReadonly();

  establecer(usuario: UsuarioAutenticado): void {
    this.usuario.set(usuario);
    this.inicializando.set(false);
  }

  limpiar(): void {
    this.usuario.set(null);
    this.inicializando.set(false);
  }
}
