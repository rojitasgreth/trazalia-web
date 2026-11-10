import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthApi } from '../../core/auth/auth-api';
import { AuthStore } from '../../core/auth/auth.store';
import { Marca } from '../../compartido/ui/marca/marca';

/** A01 · Inicio de sesión. BR-010: acepta correo o nombre de usuario. */
@Component({
  selector: 'app-pagina-inicio-sesion',
  imports: [ReactiveFormsModule, Marca],
  template: `
    <main class="contenedor">
      <form class="tarjeta" [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <app-marca />
        <h1>Iniciar sesión</h1>

        <label for="identificador">Correo o nombre de usuario</label>
        <input
          id="identificador"
          type="text"
          formControlName="identificador"
          autocomplete="username"
          [attr.aria-invalid]="mostrarError()"
        />

        <label for="contrasena">Contraseña</label>
        <input
          id="contrasena"
          type="password"
          formControlName="contrasena"
          autocomplete="current-password"
          [attr.aria-invalid]="mostrarError()"
        />

        @if (mostrarError()) {
          <p class="error" role="alert">{{ mensajeError() }}</p>
        }

        <button type="submit" class="boton-primario" [disabled]="formulario.invalid || enviando()">
          @if (enviando()) {
            Entrando…
          } @else {
            Entrar
          }
        </button>
      </form>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }
    .contenedor {
      display: grid;
      min-height: 100dvh;
      place-items: center;
      padding: 24px 16px;
    }
    .tarjeta {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: min(100%, 390px);
      padding: 32px 24px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    h1 {
      margin: 0 0 4px;
      font-size: var(--texto-titulo);
    }
    label {
      font-size: var(--texto-s);
      font-weight: 600;
      color: var(--color-texto-medio);
    }
    input {
      padding: 10px 12px;
      font: inherit;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-control);
      background: var(--color-superficie);
      color: var(--color-texto);
    }
    input[aria-invalid='true'] {
      border-color: var(--color-aviso-borde);
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
    .boton-primario {
      margin-top: 8px;
      padding: 11px 16px;
      border: none;
      border-radius: var(--radio-control);
      background: var(--color-primario);
      color: var(--color-sobre-primario);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .boton-primario:hover:not(:disabled) {
      background: var(--color-primario-hover);
    }
    .boton-primario:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class PaginaInicioSesion {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);
  protected readonly mostrarError = () => this.mensajeError() !== null;

  protected readonly formulario = this.fb.nonNullable.group({
    identificador: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.mensajeError.set(null);
    this.enviando.set(true);

    const { identificador, contrasena } = this.formulario.getRawValue();
    this.authApi.iniciarSesion({ identificador, contrasena }).subscribe({
      next: (respuesta) => {
        this.authStore.establecer(respuesta.usuario);
        this.enviando.set(false);
        void this.router.navigate(['/']);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        const mensaje =
          error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
            ? error.error.message
            : 'No se pudo iniciar sesión. Inténtalo de nuevo.';
        this.mensajeError.set(mensaje);
      },
    });
  }
}
