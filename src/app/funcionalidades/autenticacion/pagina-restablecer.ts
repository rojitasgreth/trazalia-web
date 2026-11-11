import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApi } from '../../core/auth/auth-api';
import {
  contrasenasCoinciden,
  sinEspacios,
} from '../../compartido/formularios/validadores-contrasena';
import { EnlaceInvalido } from '../../compartido/ui/enlace-invalido/enlace-invalido';
import { Marca } from '../../compartido/ui/marca/marca';

/** A07 · Restablecimiento de contraseña desde el enlace de recuperación (BR-013/014). */
@Component({
  selector: 'app-pagina-restablecer',
  imports: [ReactiveFormsModule, RouterLink, Marca, EnlaceInvalido],
  template: `
    @if (!token() || enlaceInvalido()) {
      <app-enlace-invalido />
    } @else {
      <main class="contenedor">
        <div class="tarjeta">
          <app-marca />

          @if (actualizada()) {
            <h1>Contraseña actualizada</h1>
            <p>Ya puedes iniciar sesión con tu contraseña nueva.</p>
            <a routerLink="/iniciar-sesion" class="boton-primario">Ir a iniciar sesión</a>
          } @else {
            <h1>Crea una contraseña nueva</h1>
            <p>Elige una contraseña que no hayas usado antes en Trazalia.</p>

            <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
              <label for="contrasena">Contraseña nueva</label>
              <input
                id="contrasena"
                type="password"
                formControlName="contrasena"
                autocomplete="new-password"
                [attr.aria-invalid]="mostrarErrorCampo('contrasena')"
              />
              @if (mostrarErrorCampo('contrasena')) {
                <p class="error-campo">
                  Debe tener entre 8 y 32 caracteres y no contener espacios.
                </p>
              }

              <label for="confirmarContrasena">Repite la contraseña</label>
              <input
                id="confirmarContrasena"
                type="password"
                formControlName="confirmarContrasena"
                autocomplete="new-password"
                [attr.aria-invalid]="mostrarErrorConfirmacion()"
              />
              @if (mostrarErrorConfirmacion()) {
                <p class="error-campo">Las contraseñas no coinciden.</p>
              }

              <p class="ayuda">
                Al guardar se cerrarán tus sesiones abiertas en todos los dispositivos y te
                avisaremos por correo.
              </p>

              <button
                type="submit"
                class="boton-primario"
                [disabled]="formulario.invalid || enviando()"
              >
                @if (enviando()) {
                  Guardando…
                } @else {
                  Guardar contraseña
                }
              </button>
            </form>
          }
        </div>
      </main>
    }
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
    p {
      margin: 0;
      color: var(--color-texto-medio);
      line-height: 1.5;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
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
    .error-campo {
      margin: -4px 0 0;
      font-size: var(--texto-xs);
      color: var(--color-aviso);
    }
    .ayuda {
      margin: 0;
      font-size: var(--texto-xs);
      color: var(--color-texto-secundario);
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
      text-align: center;
      text-decoration: none;
      display: inline-flex;
      justify-content: center;
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
export class PaginaRestablecer {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly token = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('token'));
  protected readonly enviando = signal(false);
  protected readonly actualizada = signal(false);
  protected readonly enlaceInvalido = signal(false);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      contrasena: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(32), sinEspacios],
      ],
      confirmarContrasena: ['', [Validators.required]],
    },
    { validators: contrasenasCoinciden },
  );

  protected mostrarErrorCampo(nombre: 'contrasena'): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && control.touched;
  }

  protected mostrarErrorConfirmacion(): boolean {
    const confirmar = this.formulario.controls.confirmarContrasena;
    return this.formulario.hasError('noCoinciden') && confirmar.touched;
  }

  protected enviar(): void {
    const token = this.token();
    if (this.formulario.invalid || this.enviando() || !token) {
      return;
    }
    this.enviando.set(true);

    this.authApi
      .restablecerContrasena({ token, contrasena: this.formulario.getRawValue().contrasena })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.actualizada.set(true);
        },
        // Un 400 en este endpoint siempre significa token inexistente,
        // vencido o ya usado: se muestra la misma pantalla compartida.
        error: () => {
          this.enviando.set(false);
          this.enlaceInvalido.set(true);
        },
      });
  }
}
