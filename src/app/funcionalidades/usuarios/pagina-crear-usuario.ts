import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UsuariosApi } from '../../core/admin/usuarios-api';

/** A09 · Un administrador crea un usuario y dispara su invitación (BR-002–007). */
@Component({
  selector: 'app-pagina-crear-usuario',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="panel">
      <h1>Nuevo usuario</h1>

      <form [formGroup]="formulario" (ngSubmit)="enviar()" novalidate>
        <div class="fila">
          <div class="campo campo--corto">
            <label for="nacionalidad">Nacionalidad</label>
            <select id="nacionalidad" formControlName="nacionalidad">
              <option value="V">V</option>
              <option value="E">E</option>
            </select>
          </div>
          <div class="campo">
            <label for="cedula">Cédula</label>
            <input id="cedula" type="text" formControlName="cedula" inputmode="numeric" />
          </div>
        </div>

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
          <label for="telefono">Teléfono (opcional)</label>
          <input id="telefono" type="text" formControlName="telefono" />
        </div>

        <div class="campo">
          <label for="rol">Rol</label>
          <select id="rol" formControlName="rol">
            <option value="FISIOTERAPEUTA">Fisioterapeuta</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
        </div>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <div class="acciones">
          <a routerLink="/usuarios" class="boton-secundario">Cancelar</a>
          <button
            type="submit"
            class="boton-primario"
            [disabled]="formulario.invalid || enviando()"
          >
            @if (enviando()) {
              Creando…
            } @else {
              Crear e invitar
            }
          </button>
        </div>
      </form>
    </section>
  `,
  styles: `
    .panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: min(100%, 480px);
      margin: 32px auto;
      padding: 32px 24px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .fila {
      display: flex;
      gap: 12px;
    }
    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .campo--corto {
      flex: 0 0 90px;
    }
    label {
      font-size: var(--texto-s);
      font-weight: 600;
      color: var(--color-texto-medio);
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
    .acciones {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
    .boton-primario,
    .boton-secundario {
      padding: 11px 18px;
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
  `,
})
export class PaginaCrearUsuario {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(UsuariosApi);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nacionalidad: ['V' as 'V' | 'E', [Validators.required]],
    cedula: ['', [Validators.required, Validators.pattern(/^\d{1,9}$/)]],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    rol: ['FISIOTERAPEUTA' as 'ADMINISTRADOR' | 'FISIOTERAPEUTA', [Validators.required]],
  });

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }
    this.error.set(null);
    this.enviando.set(true);

    const valores = this.formulario.getRawValue();
    this.api.crear({ ...valores, telefono: valores.telefono || undefined }).subscribe({
      next: (respuesta) => {
        this.enviando.set(false);
        void this.router.navigate(['/usuarios', respuesta.usuario.idUsuario]);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.error.set(this.mensajeDeError(error));
      },
    });
  }

  private mensajeDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }
    return 'No se pudo crear el usuario. Inténtalo de nuevo.';
  }
}
