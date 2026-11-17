import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { TipoHistoria } from '../../core/historias/historias.model';
import { ORDEN_TIPOS, TIPOS } from './compartido/presentacion';

/** B06 · Crear nueva historia: elegir uno de los cuatro tipos (RF-002). */
@Component({
  selector: 'app-pagina-elegir-tipo',
  imports: [RouterLink],
  template: `
    <div class="pagina">
      <div class="cabecera">
        <a routerLink="/historias" class="volver">← Historias clínicas</a>
        <h1>Crear nueva historia clínica</h1>
        <p>Elige el tipo. El formulario de datos personales cambia según el tipo.</p>
      </div>

      <form (submit)="$event.preventDefault(); continuar()">
        <fieldset>
          <legend class="hc-solo-lector">Tipo de historia</legend>
          <div class="opciones">
            @for (tipo of tipos; track tipo) {
              <label class="opcion" [class.seleccionada]="seleccionado() === tipo">
                <span class="opcion-cabecera">
                  <span [class]="'icono ' + info(tipo).clase">{{ info(tipo).iniciales }}</span>
                  <input
                    type="radio"
                    name="tipo"
                    [value]="tipo"
                    [checked]="seleccionado() === tipo"
                    (change)="seleccionado.set(tipo)"
                  />
                </span>
                <span class="opcion-titulo">{{ info(tipo).nombre }}</span>
                <span class="opcion-descripcion">{{ info(tipo).descripcion }}</span>
                @if (info(tipo).nota) {
                  <span class="nota">{{ info(tipo).nota }}</span>
                }
              </label>
            }
          </div>
        </fieldset>

        <p class="aviso">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8v.5" />
          </svg>
          Si el paciente ya tiene una historia de otro tipo, podrás reutilizar sus datos personales.
          Cada paciente puede tener una sola historia de cada tipo.
        </p>

        <div class="acciones">
          <a routerLink="/historias" class="hc-boton" data-variante="neutro">Cancelar</a>
          <button
            type="submit"
            class="hc-boton"
            data-variante="primario"
            [disabled]="!seleccionado()"
          >
            Continuar
          </button>
        </div>
      </form>
    </div>
  `,
  styles: `
    .pagina {
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding: 32px;
    }
    .cabecera {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .volver {
      font-size: var(--texto-s);
      font-weight: 600;
      text-decoration: none;
    }
    h1 {
      margin: 0;
      font-size: var(--texto-titulo);
    }
    .cabecera p {
      margin: 0;
      color: var(--color-texto-secundario);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
    }
    .opciones {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
      gap: 14px;
    }
    .opcion {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 20px;
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-panel);
      background: var(--color-superficie);
      cursor: pointer;
    }
    .opcion.seleccionada {
      padding: 19px;
      border: 2px solid var(--color-primario);
      background: var(--color-seleccion-fondo);
    }
    .opcion:focus-within {
      outline: 3px solid var(--color-primario);
      outline-offset: 2px;
    }
    .opcion-cabecera {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .icono {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 14px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .icono.tipo-neuro {
      background: var(--color-tipo-neuro-fondo);
      color: var(--color-tipo-neuro-texto);
    }
    .icono.tipo-trauma {
      background: var(--color-info-fondo);
      color: var(--color-info);
    }
    .icono.tipo-infantil {
      background: var(--color-aviso-fondo);
      color: var(--color-aviso-intenso);
    }
    .icono.tipo-adulto-mayor {
      background: var(--color-primario-suave);
      color: var(--color-primario-hover);
    }
    input[type='radio'] {
      width: 22px;
      height: 22px;
      margin: 4px 0 0;
      accent-color: var(--color-primario);
    }
    .opcion-titulo {
      font-size: 18px;
      font-weight: 700;
    }
    .opcion-descripcion {
      color: var(--color-texto-medio);
      font-size: var(--texto-s);
      line-height: 1.5;
    }
    .nota {
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: var(--radio-pildora);
      background: var(--color-aviso-fondo);
      color: var(--color-aviso-intenso);
      font-size: 12px;
      font-weight: 700;
    }
    .aviso {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      margin: 0;
      padding: 12px 14px;
      border-radius: var(--radio-tarjeta);
      background: var(--color-info-fondo);
      color: var(--color-info);
      font-size: var(--texto-s);
      line-height: 1.5;
    }
    .aviso svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 10px;
    }
    @media (max-width: 720px) {
      .pagina {
        padding: 20px 16px;
      }
    }
  `,
})
export class PaginaElegirTipo {
  private readonly router = inject(Router);

  protected readonly tipos = ORDEN_TIPOS;
  protected readonly seleccionado = signal<TipoHistoria | null>(null);

  protected info(tipo: TipoHistoria) {
    return TIPOS[tipo];
  }

  protected continuar(): void {
    const tipo = this.seleccionado();
    if (tipo) {
      void this.router.navigate(['/historias/nueva', tipo]);
    }
  }
}
