import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  type AbstractControl,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApi } from '../../core/auth/auth-api';
import { Marca } from '../../compartido/ui/marca/marca';

function sinEspacios(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && /\s/.test(control.value)
    ? { sinEspacios: true }
    : null;
}

function contrasenasCoinciden(control: AbstractControl): ValidationErrors | null {
  const contrasena = control.get('contrasena')?.value;
  const confirmar = control.get('confirmarContrasena')?.value;
  return contrasena && confirmar && contrasena !== confirmar ? { noCoinciden: true } : null;
}

/** A11/A12 · Activación de cuenta desde el enlace de invitación (BR-007/008). */
@Component({
  selector: 'app-pagina-activar-cuenta',
  imports: [ReactiveFormsModule, RouterLink, Marca],
  template: `
    <main class="contenedor">
      <div class="tarjeta">
        <app-marca />

        @if (!token()) {
          <h1>Enlace inválido</h1>
          <p>
            Este enlace de activación no es válido. Pide a tu administrador que te reenvíe la
            invitación.
          </p>
          <a routerLink="/iniciar-sesion" class="boton-primario">Ir a iniciar sesión</a>
        } @else if (activada()) {
          <h1>Cuenta activada</h1>
          <p>Tu contraseña quedó creada. Ya puedes iniciar sesión.</p>
          <a routerLink="/iniciar-sesion" class="boton-primario">Ir a iniciar sesión</a>
        } @else {
          <h1>Crea tu contraseña</h1>
          <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
            <label for="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              formControlName="contrasena"
              autocomplete="new-password"
              [attr.aria-invalid]="mostrarErrorCampo('contrasena')"
            />
            @if (mostrarErrorCampo('contrasena')) {
              <p class="error-campo">Debe tener entre 8 y 128 caracteres y no contener espacios.</p>
            }

            <label for="confirmarContrasena">Confirmar contraseña</label>
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

            @if (error()) {
              <p class="error" role="alert">{{ error() }}</p>
            }

            <button
              type="submit"
              class="boton-primario"
              [disabled]="formulario.invalid || enviando()"
            >
              @if (enviando()) {
                Creando cuenta…
              } @else {
                Activar cuenta
              }
            </button>
          </form>
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
export class PaginaActivarCuenta {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly token = signal(inject(ActivatedRoute).snapshot.queryParamMap.get('token'));
  protected readonly enviando = signal(false);
  protected readonly activada = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group(
    {
      contrasena: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(128), sinEspacios],
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
    this.error.set(null);
    this.enviando.set(true);

    this.authApi
      .aceptarInvitacion({ token, contrasena: this.formulario.getRawValue().contrasena })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.activada.set(true);
        },
        error: (error: unknown) => {
          this.enviando.set(false);
          const mensaje =
            error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
              ? error.error.message
              : 'No se pudo activar la cuenta. El enlace puede haber vencido o ya haberse usado.';
          this.error.set(mensaje);
        },
      });
  }
}
