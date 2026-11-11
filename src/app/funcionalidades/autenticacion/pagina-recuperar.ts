import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../core/auth/auth-api';
import { Marca } from '../../compartido/ui/marca/marca';

/** A04/A05 · Solicitar recuperación de contraseña (BR-013, AC-012). */
@Component({
  selector: 'app-pagina-recuperar',
  imports: [ReactiveFormsModule, RouterLink, Marca],
  template: `
    <main class="contenedor">
      <div class="tarjeta">
        @if (enviado()) {
          <h1>Revisa tu correo</h1>
          <p>
            Si el correo pertenece a una cuenta de Trazalia, te enviamos un enlace para crear una
            contraseña nueva.
          </p>
          <p class="secundario">
            El enlace vence en 15 minutos y solo funciona una vez. Si no llega, revisa la carpeta de
            spam o vuelve a solicitarlo.
          </p>
          <button type="button" class="boton-secundario" (click)="enviado.set(false)">
            Solicitar otro enlace
          </button>
          <a routerLink="/iniciar-sesion" class="boton-primario">Volver a iniciar sesión</a>
        } @else {
          <app-marca />
          <h1>Recupera tu acceso</h1>
          <p>
            Escribe el correo con el que te invitaron. Te enviaremos un enlace para crear una
            contraseña nueva.
          </p>

          <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
            <label for="correo">Correo electrónico</label>
            <input id="correo" type="email" formControlName="correo" autocomplete="email" />

            @if (error()) {
              <p class="mensaje-error" role="alert">{{ error() }}</p>
            }

            <button
              type="submit"
              class="boton-primario"
              [disabled]="formulario.invalid || enviando()"
            >
              @if (enviando()) {
                Enviando…
              } @else {
                Enviar enlace
              }
            </button>
          </form>

          <div class="info">
            <span class="info-titulo">Cómo funciona</span>
            <ol>
              <li>Recibes un enlace que vence en 15 minutos y sirve una sola vez.</li>
              <li>Creas una contraseña nueva.</li>
              <li>Se cierran tus sesiones abiertas en todos los dispositivos.</li>
            </ol>
          </div>

          <a routerLink="/iniciar-sesion" class="enlace-volver">Volver a iniciar sesión</a>
        }
      </div>
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
      gap: 16px;
      width: min(100%, 390px);
      padding: 32px 24px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
      line-height: 1.15;
    }
    p {
      margin: 0;
      color: var(--color-texto-medio);
      line-height: 1.55;
    }
    .secundario {
      color: var(--color-texto-secundario);
      font-size: var(--texto-s);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 8px;
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
    .mensaje-error {
      margin: 0;
      padding: 8px 10px;
      border-radius: var(--radio-control);
      background: var(--color-aviso-fondo);
      border: 1px solid var(--color-aviso-borde);
      color: var(--color-aviso);
      font-size: var(--texto-s);
    }
    .info {
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: var(--color-fondo);
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      padding: 14px 16px;
    }
    .info-titulo {
      font-size: var(--texto-s);
      font-weight: 700;
    }
    .info ol {
      margin: 0;
      padding-left: 20px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: var(--texto-s);
      color: var(--color-texto-medio);
    }
    .enlace-volver {
      align-self: center;
      font-size: var(--texto-m);
      font-weight: 600;
      text-decoration: none;
      padding: 12px;
    }
    .boton-primario,
    .boton-secundario {
      padding: 13px 16px;
      border-radius: var(--radio-control);
      border: 1.5px solid transparent;
      font: inherit;
      font-size: var(--texto-l);
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
      display: inline-flex;
      justify-content: center;
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
      border-color: var(--color-primario);
      color: var(--color-primario);
    }
  `,
})
export class PaginaRecuperar {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.error.set(null);
    this.enviando.set(true);

    this.authApi.solicitarRecuperacion(this.formulario.getRawValue().correo).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No se pudo enviar la solicitud. Inténtalo de nuevo.');
      },
    });
  }
}
