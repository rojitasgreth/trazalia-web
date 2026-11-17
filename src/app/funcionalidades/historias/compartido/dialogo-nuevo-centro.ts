import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CentrosApi } from '../../../core/centros/centros-api';
import type { CentroMedico, ErrorCentroExistente } from '../../../core/centros/centros.model';
import { ENTIDADES_FEDERALES } from './definicion-formulario';
import { DialogoHistoria } from './dialogo-historia';

/**
 * B31 · Registrar un centro médico en el catálogo compartido (SPEC B v1.4
 * §8.7). Si ya existe (mismo nombre, estado y municipio), lo muestra y ofrece
 * usarlo en lugar de duplicarlo.
 */
@Component({
  selector: 'app-dialogo-nuevo-centro',
  imports: [DialogoHistoria, ReactiveFormsModule],
  template: `
    <app-dialogo-historia
      icono="copia"
      variante="exito"
      titulo="Nuevo centro médico"
      texto="Lo verán todos los fisioterapeutas al buscar centros, así que revisa el nombre y la ubicación."
      (cerrar)="cancelar.emit()"
    >
      @if (existente(); as centro) {
        <div class="existente" role="alert">
          <strong>Este centro ya está registrado.</strong>
          <span class="existente-nombre">{{ centro.nombre }}</span>
          <span class="existente-ubicacion"
            >{{ centro.parroquia }}, {{ centro.municipio }}, {{ centro.estado }}</span
          >
        </div>
      }
      <form id="form-centro" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
        <div class="campo completo">
          <label for="centro-nombre">Nombre del centro <span class="asterisco">*</span></label>
          <input id="centro-nombre" formControlName="nombre" maxlength="150" />
        </div>
        <div class="campo">
          <label for="centro-estado">Estado <span class="asterisco">*</span></label>
          <select id="centro-estado" formControlName="dirEstado">
            <option value="">Selecciona</option>
            @for (estado of estados; track estado) {
              <option [value]="estado">{{ estado }}</option>
            }
          </select>
        </div>
        <div class="campo">
          <label for="centro-municipio">Municipio <span class="asterisco">*</span></label>
          <input id="centro-municipio" formControlName="dirMunicipio" maxlength="100" />
        </div>
        <div class="campo">
          <label for="centro-parroquia">Parroquia <span class="asterisco">*</span></label>
          <input id="centro-parroquia" formControlName="dirParroquia" maxlength="100" />
        </div>
        <div class="campo">
          <label for="centro-comunidad">Comunidad o sector (opcional)</label>
          <input id="centro-comunidad" formControlName="dirComunidad" maxlength="200" />
        </div>
      </form>
      @if (intentado() && formulario.invalid) {
        <p class="error" role="alert">
          Completa el nombre, el estado, el municipio y la parroquia.
        </p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <ng-container acciones>
        <button type="button" class="hc-boton" data-variante="neutro" (click)="cancelar.emit()">
          Cancelar
        </button>
        @if (existente(); as centro) {
          <button
            type="button"
            class="hc-boton"
            data-variante="primario"
            (click)="creado.emit(centro)"
          >
            Usar este centro
          </button>
        } @else {
          <button
            type="submit"
            form="form-centro"
            class="hc-boton"
            data-variante="primario"
            [disabled]="enviando()"
          >
            {{ enviando() ? 'Guardando…' : 'Agregar centro' }}
          </button>
        }
      </ng-container>
    </app-dialogo-historia>
  `,
  styles: `
    form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
      gap: 14px 16px;
    }
    .campo {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .completo {
      grid-column: 1 / -1;
    }
    label {
      font-size: var(--texto-s);
      font-weight: 600;
    }
    .asterisco {
      color: var(--color-aviso);
    }
    input,
    select {
      height: 46px;
      padding: 0 12px;
      border: 1px solid var(--color-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-superficie);
      color: var(--color-texto);
      font: inherit;
    }
    .existente {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 12px 14px;
      border: 1px solid var(--color-aviso-borde);
      border-radius: var(--radio-tarjeta);
      background: var(--color-aviso-fondo);
      color: var(--color-aviso-intenso);
    }
    .existente-nombre {
      color: var(--color-texto);
      font-weight: 700;
    }
    .existente-ubicacion {
      color: var(--color-texto-secundario);
      font-size: var(--texto-xs);
    }
    .error {
      margin: 0;
      color: var(--color-aviso);
      font-size: var(--texto-s);
      font-weight: 600;
    }
  `,
})
export class DialogoNuevoCentro implements OnInit {
  private readonly api = inject(CentrosApi);

  /** Lo escrito en el buscador. */
  readonly nombreInicial = input('');
  readonly creado = output<CentroMedico>();
  readonly cancelar = output<void>();

  protected readonly estados = ENTIDADES_FEDERALES;
  protected readonly enviando = signal(false);
  protected readonly intentado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly existente = signal<CentroMedico | null>(null);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    dirEstado: ['', [Validators.required]],
    dirMunicipio: ['', [Validators.required]],
    dirParroquia: ['', [Validators.required]],
    dirComunidad: [''],
  });

  ngOnInit(): void {
    this.formulario.controls.nombre.setValue(this.nombreInicial());
  }

  protected guardar(): void {
    this.intentado.set(true);
    if (this.formulario.invalid || this.enviando()) return;
    this.enviando.set(true);
    this.error.set(null);
    const v = this.formulario.getRawValue();
    this.api.crear({ ...v, dirComunidad: v.dirComunidad.trim() || null }).subscribe({
      next: (centro) => {
        this.enviando.set(false);
        this.creado.emit(centro);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.existente.set((error.error as ErrorCentroExistente).centro);
          return;
        }
        this.error.set('No se pudo registrar el centro. Inténtalo de nuevo.');
      },
    });
  }
}
