import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Marca } from '../marca/marca';

/** A08 · Enlace vencido o usado, compartida entre invitación y recuperación. */
@Component({
  selector: 'app-enlace-invalido',
  imports: [RouterLink, Marca],
  template: `
    <main class="contenedor">
      <div class="tarjeta">
        <app-marca />
        <h1>Este enlace ya no funciona</h1>
        <p class="texto">
          Puede que haya vencido, que ya se haya usado o que se haya enviado uno más reciente.
        </p>

        <section class="caja">
          <div class="bloque">
            <span class="titulo">¿Era una invitación?</span>
            <span class="texto"
              >Pide al administrador que te envíe una nueva. Las invitaciones vencen a las 24
              horas.</span
            >
          </div>
          <div class="bloque">
            <span class="titulo">¿Era para recuperar tu contraseña?</span>
            <span class="texto">Solicita un enlace nuevo. Vence a los 15 minutos.</span>
            <a routerLink="/recuperar">Solicitar enlace nuevo</a>
          </div>
        </section>

        <a routerLink="/iniciar-sesion" class="boton-primario">Ir a iniciar sesión</a>
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
    .texto {
      margin: 0;
      font-size: var(--texto-m);
      line-height: 1.55;
      color: var(--color-texto-medio);
    }
    .caja {
      display: flex;
      flex-direction: column;
      background: var(--color-fondo);
      border: 1px solid var(--color-borde-suave);
      border-radius: var(--radio-tarjeta);
      padding: 4px 16px;
    }
    .bloque {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 0;
    }
    .bloque + .bloque {
      border-top: 1px solid var(--color-borde-suave);
    }
    .titulo {
      font-size: var(--texto-m);
      font-weight: 700;
    }
    .bloque .texto {
      font-size: var(--texto-s);
    }
    .bloque a {
      font-size: var(--texto-s);
      font-weight: 600;
      text-decoration: none;
    }
    .boton-primario {
      margin-top: 8px;
      padding: 13px 16px;
      border-radius: var(--radio-control);
      background: var(--color-primario);
      color: var(--color-sobre-primario);
      font-size: var(--texto-l);
      font-weight: 600;
      text-align: center;
      text-decoration: none;
    }
    .boton-primario:hover {
      background: var(--color-primario-hover);
    }
  `,
})
export class EnlaceInvalido {}
