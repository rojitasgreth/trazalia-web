import { Component } from '@angular/core';

/** Logotipo de Trazalia tal como aparece en el prototipo (A01). */
@Component({
  selector: 'app-marca',
  template: `
    <span class="icono" aria-hidden="true">
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="6" r="2" />
        <path d="M7 17c4-1 2-6 6-7s3-3 4.5-2.8" />
      </svg>
    </span>
    <span class="nombre">Trazalia</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .icono {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: var(--color-primario);
      color: var(--color-sobre-primario);
    }
    .nombre {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
  `,
})
export class Marca {}
