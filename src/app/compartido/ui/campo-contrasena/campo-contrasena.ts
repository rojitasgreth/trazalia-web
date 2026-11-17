import { Component, ElementRef, contentChild, effect, signal } from '@angular/core';

/**
 * Envuelve un <input type="password" #campo> y añade el botón de mostrar u
 * ocultar la contraseña (icono de ojo). El input conserva su formControlName,
 * su id y sus atributos; aquí solo se alterna su tipo.
 *
 *   <app-campo-contrasena>
 *     <input #campo id="contrasena" type="password" formControlName="contrasena" />
 *   </app-campo-contrasena>
 */
@Component({
  selector: 'app-campo-contrasena',
  template: `
    <ng-content />
    <button
      type="button"
      class="ver"
      [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="idCampo()"
      (click)="alternar()"
    >
      @if (visible()) {
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3l18 18" />
          <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3.2 4.1" />
          <path d="M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.7 9.7 0 0 0 5.4-1.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
      } @else {
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      }
    </button>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    .ver {
      position: absolute;
      top: 50%;
      right: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      transform: translateY(-50%);
      border: 0;
      border-radius: var(--radio-control);
      background: transparent;
      color: var(--color-texto-secundario);
      cursor: pointer;
    }
    .ver:hover {
      color: var(--color-texto);
    }
  `,
})
export class CampoContrasena {
  private readonly campo = contentChild.required<ElementRef<HTMLInputElement>>('campo');

  protected readonly visible = signal(false);
  protected readonly idCampo = () => this.campo().nativeElement.id || null;

  constructor() {
    effect(() => {
      const input = this.campo().nativeElement;
      input.type = this.visible() ? 'text' : 'password';
      // Deja sitio al botón para que el texto no quede debajo del icono.
      input.style.width = '100%';
      input.style.paddingRight = '44px';
      input.style.boxSizing = 'border-box';
    });
  }

  protected alternar(): void {
    this.visible.update((v) => !v);
  }
}
