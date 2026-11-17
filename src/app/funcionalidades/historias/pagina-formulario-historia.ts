import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HistoriasApi } from '../../core/historias/historias-api';
import type {
  CrearHistoriaPayload,
  DatosPersonales,
  ErrorDuplicado,
  ErrorValidacion,
  HistoriaDetalle,
  TipoHistoria,
} from '../../core/historias/historias.model';
import {
  SEXOS,
  camposFaltantes,
  resumirFaltantes,
  seccionesDe,
  totalExigibles,
  type CampoDef,
  type SeccionDef,
} from './compartido/definicion-formulario';
import { DialogoDuplicado } from './compartido/dialogo-duplicado';
import { TIPOS, calcularEdad, esTipoValido, type InfoTipo } from './compartido/presentacion';

type CampoIdentificacion = ErrorValidacion['errores'][number]['campo'];

const TELEFONO = /^[\d\s+()-]*$/;

// Mensajes de B12 (los mismos que devuelve el backend, §9.2).
const MENSAJES: Record<CampoIdentificacion, string> = {
  nombre: 'Escribe el nombre. Es obligatorio para crear la historia.',
  apellido: 'Escribe el apellido. Es obligatorio para crear la historia.',
  documento:
    'Escribe la nacionalidad y el número de cédula. Son obligatorios para crear la historia.',
  fechaNacimiento: 'Escribe la fecha de nacimiento. Sin documento, es obligatoria.',
};

const NOMBRES_FALTANTE: Record<CampoIdentificacion, string> = {
  nombre: 'el nombre',
  apellido: 'el apellido',
  documento: 'la cédula',
  fechaNacimiento: 'la fecha de nacimiento',
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fechaNoFutura(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value > hoyIso() ? { futura: true } : null;
}

/** B07–B12, B19 · Nueva historia: datos personales según el tipo (SPEC §8–§9). */
@Component({
  selector: 'app-pagina-formulario-historia',
  imports: [ReactiveFormsModule, RouterLink, DialogoDuplicado],
  template: `
    <div class="pagina">
      <header class="cabecera">
        <a routerLink="/historias/nueva" class="volver">← Cambiar tipo de historia</a>
        <div class="titulo">
          <h1>Nueva historia clínica</h1>
          <span class="hc-chip" data-estado="borrador">Borrador</span>
        </div>
        <p class="subtitulo">
          <span class="hc-punto" [attr.data-tipo]="tipo"></span>{{ info.nombre }} · se guardará como
          borrador
        </p>
      </header>

      @if (errorGuardado()) {
        <div class="banner banner--error" role="alert">
          <div class="banner-texto">
            <strong>No pudimos guardar la historia</strong>
            <span
              >Revisa tu conexión e inténtalo de nuevo. Lo que escribiste sigue en el
              formulario.</span
            >
          </div>
          <button type="button" class="banner-boton" (click)="guardar()">Reintentar</button>
        </div>
      } @else if (intentado() && erroresIdentificacion().length > 0) {
        <div class="banner banner--aviso" role="alert">
          <div class="banner-texto">
            <strong>{{ tituloValidacion() }}</strong>
            <span>{{ textoValidacion() }}</span>
          </div>
        </div>
      }

      <div class="cuerpo">
        <form id="formulario-historia" [formGroup]="formulario" (ngSubmit)="guardar()" novalidate>
          <p class="nota-obligatorio">
            <span class="asterisco">*</span> Obligatorio para crear la historia. Lo demás puede
            completarse después.
          </p>

          @for (seccion of secciones; track seccion.titulo) {
            <section class="seccion" [attr.aria-labelledby]="idSeccion($index)">
              <div class="seccion-cabecera">
                <h2 [id]="idSeccion($index)">{{ seccion.titulo }}</h2>
                @if (seccion.nota) {
                  <span class="seccion-nota">{{ seccion.nota }}</span>
                }
              </div>
              <div class="rejilla">
                @for (campo of seccion.campos; track campo.clave) {
                  <div [class.completo]="esCompleto(campo)">
                    @switch (campo.tipo) {
                      @case ('documento') {
                        <fieldset class="grupo" [attr.aria-describedby]="'documento-msg'">
                          <legend>
                            Documento de identidad
                            @if (esAdulto) {
                              <span class="asterisco"> *</span>
                            }
                          </legend>
                          <div class="documento">
                            <label for="nacionalidad" class="hc-solo-lector">Nacionalidad</label>
                            <select
                              id="nacionalidad"
                              formControlName="nacionalidad"
                              class="nacionalidad"
                              [class.invalido]="muestraError('documento')"
                            >
                              <option value="">
                                {{ esAdulto ? 'Nacionalidad' : 'Pendiente' }}
                              </option>
                              <option value="V">V</option>
                              <option value="E">E</option>
                            </select>
                            <label for="cedula" class="hc-solo-lector">Número de cédula</label>
                            <input
                              id="cedula"
                              formControlName="cedula"
                              inputmode="numeric"
                              maxlength="11"
                              placeholder="Número de cédula"
                              [attr.aria-invalid]="muestraError('documento')"
                              aria-describedby="documento-msg"
                              [class.invalido]="muestraError('documento')"
                            />
                            @if (!esAdulto) {
                              <label class="opcion" [class.marcada]="sinDocumento()">
                                <input type="checkbox" formControlName="sinDocumento" />
                                Sin documento
                              </label>
                            }
                          </div>
                          <span
                            id="documento-msg"
                            [class]="
                              muestraError('documento') ? 'mensaje mensaje--error' : 'mensaje'
                            "
                            >{{ mensajeDocumento() }}</span
                          >
                        </fieldset>
                      }
                      @case ('edad') {
                        <div class="campo">
                          <label for="edad">Edad</label>
                          <input
                            id="edad"
                            type="text"
                            readonly
                            class="calculado"
                            placeholder="—"
                            [value]="edad()"
                            aria-describedby="edad-msg"
                          />
                          <span id="edad-msg" class="mensaje"
                            >Se calcula con la fecha de nacimiento. No se edita.</span
                          >
                        </div>
                      }
                      @case ('sexo') {
                        <fieldset class="grupo">
                          <legend>Sexo</legend>
                          <div class="opciones">
                            @for (s of sexos; track s.valor) {
                              <label class="opcion" [class.marcada]="valor('sexo') === s.valor">
                                <input type="radio" formControlName="sexo" [value]="s.valor" />
                                {{ s.etiqueta }}
                              </label>
                            }
                          </div>
                        </fieldset>
                      }
                      @case ('casillas') {
                        <fieldset class="grupo" aria-describedby="fuente-msg">
                          <legend>{{ campo.etiqueta }}</legend>
                          <div class="opciones">
                            @for (opcion of fuentes; track opcion) {
                              <label class="opcion" [class.marcada]="fuenteMarcada(opcion)">
                                <input
                                  type="checkbox"
                                  [checked]="fuenteMarcada(opcion)"
                                  (change)="alternarFuente(opcion)"
                                />
                                {{ opcion }}
                              </label>
                            }
                          </div>
                          <span id="fuente-msg" class="mensaje">{{ ayuda(campo) }}</span>
                        </fieldset>
                      }
                      @case ('seleccion') {
                        <div class="campo">
                          <label [for]="campo.clave">{{ campo.etiqueta }}</label>
                          <select [id]="campo.clave" [formControlName]="campo.clave">
                            <option value="">Selecciona</option>
                            @for (opcion of opciones(campo); track opcion) {
                              <option [value]="opcion">{{ opcion }}</option>
                            }
                          </select>
                        </div>
                      }
                      @default {
                        <div class="campo">
                          <label [for]="campo.clave">
                            {{ campo.etiqueta }}
                            @if (obligatorio(campo)) {
                              <span class="asterisco"> *</span>
                            }
                          </label>
                          <input
                            [id]="campo.clave"
                            [type]="tipoInput(campo)"
                            [formControlName]="campo.clave"
                            [placeholder]="placeholder(campo)"
                            [attr.max]="campo.tipo === 'fecha' ? hoy : null"
                            [attr.aria-invalid]="
                              muestraError(campo.clave) || controlInvalido(campo.clave)
                            "
                            [attr.aria-describedby]="
                              mensajeCampo(campo) ? campo.clave + '-msg' : null
                            "
                            [class.invalido]="
                              muestraError(campo.clave) || controlInvalido(campo.clave)
                            "
                          />
                          @if (mensajeCampo(campo)) {
                            <span
                              [id]="campo.clave + '-msg'"
                              [class]="
                                muestraError(campo.clave) || controlInvalido(campo.clave)
                                  ? 'mensaje mensaje--error'
                                  : 'mensaje'
                              "
                              >{{ mensajeCampo(campo) }}</span
                            >
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            </section>
          }
        </form>

        <aside class="lateral">
          <section class="panel">
            <h2>Para crear la historia</h2>
            <ul class="requisitos">
              @for (r of requisitos(); track r.etiqueta) {
                <li [attr.data-estado]="r.estado">
                  <span class="requisito-icono" aria-hidden="true">{{ r.icono }}</span>
                  {{ r.etiqueta }}
                  <span class="hc-solo-lector">{{
                    r.estado === 'ok' ? '(listo)' : '(pendiente)'
                  }}</span>
                </li>
              }
            </ul>
          </section>
          <section class="panel">
            <div class="progreso-cabecera">
              <h2>Datos personales</h2>
              <span class="progreso-cifra">{{ completados() }} de {{ total }}</span>
            </div>
            <div
              class="barra"
              role="progressbar"
              aria-label="Datos personales completados"
              [attr.aria-valuenow]="completados()"
              aria-valuemin="0"
              [attr.aria-valuemax]="total"
            >
              <div class="barra-relleno" [style.width.%]="porcentaje()"></div>
            </div>
            @if (faltantes().length > 0) {
              <div class="faltantes">
                <span>Faltan para completarlos:</span>
                <ul>
                  @for (f of faltantesResumidos(); track f) {
                    <li>{{ f }}</li>
                  }
                </ul>
              </div>
            }
            <p class="nota-valoracion">
              La primera valoración se habilita cuando los datos personales estén completos. Al
              completarla, la historia pasa a Activa.
            </p>
          </section>
        </aside>
      </div>

      <div class="pie">
        <span class="pie-nota">Se guarda como borrador; puedes completarla después.</span>
        <a routerLink="/historias" class="hc-boton" data-variante="neutro">Cancelar</a>
        <button
          type="submit"
          form="formulario-historia"
          class="hc-boton"
          data-variante="primario"
          [disabled]="enviando()"
        >
          {{ enviando() ? 'Guardando…' : 'Guardar borrador' }}
        </button>
      </div>
    </div>

    @if (duplicada(); as existente) {
      <app-dialogo-duplicado
        [historia]="existente"
        (volver)="duplicada.set(null)"
        (abrir)="abrirExistente(existente.idHistoria)"
      />
    }
  `,
  styleUrl: './pagina-formulario-historia.css',
})
export class PaginaFormularioHistoria {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HistoriasApi);
  private readonly router = inject(Router);

  protected readonly tipo: TipoHistoria;
  protected readonly info: InfoTipo;
  protected readonly esAdulto: boolean;
  protected readonly secciones: SeccionDef[];
  protected readonly total: number;
  protected readonly sexos = SEXOS;
  protected readonly fuentes = ['Paciente', 'Familiar', 'Historia', 'Mixta'] as const;
  protected readonly hoy = hoyIso();
  private readonly ahora = new Date();

  protected readonly enviando = signal(false);
  protected readonly intentado = signal(false);
  protected readonly errorGuardado = signal(false);
  protected readonly erroresServidor = signal<Partial<Record<CampoIdentificacion, string>>>({});
  protected readonly duplicada = signal<HistoriaDetalle | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.required, Validators.maxLength(100)]],
    nacionalidad: ['' as '' | 'V' | 'E'],
    cedula: [''],
    sinDocumento: [false],
    fechaNacimiento: ['', [fechaNoFutura]],
    sexo: [''],
    dominancia: [''],
    ocupacion: ['', [Validators.maxLength(150)]],
    nivelEducativo: [''],
    estadoCivil: [''],
    lugarNacimiento: ['', [Validators.maxLength(150)]],
    telefono: ['', [Validators.pattern(TELEFONO), Validators.maxLength(30)]],
    correo: ['', [Validators.email]],
    dirEstado: [''],
    dirMunicipio: [''],
    dirParroquia: [''],
    dirComunidad: [''],
    contactoNombre: [''],
    contactoParentesco: [''],
    contactoTelefono: ['', [Validators.pattern(TELEFONO), Validators.maxLength(30)]],
    demandasFisicas: ['', [Validators.maxLength(1000)]],
    fuenteInformacion: [[] as string[]],
  });

  private readonly valores = toSignal(this.formulario.valueChanges, {
    initialValue: this.formulario.getRawValue(),
  });

  /** Datos normalizados como los recibirá el backend (vacío = null). */
  protected readonly datos = computed<DatosPersonales>(() => {
    const v = { ...this.formulario.getRawValue(), ...this.valores() };
    const nulo = (texto: string | undefined) => (texto?.trim() ? texto.trim() : null);
    const sinDocumento = !this.esAdulto && !!v.sinDocumento;
    return {
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      nacionalidad: sinDocumento ? null : v.nacionalidad || null,
      cedula: sinDocumento ? null : v.cedula.replace(/\D/g, '') || null,
      sinDocumento,
      fechaNacimiento: v.fechaNacimiento || null,
      sexo: (v.sexo || null) as DatosPersonales['sexo'],
      dominancia: v.dominancia || null,
      ocupacion: nulo(v.ocupacion),
      nivelEducativo: v.nivelEducativo || null,
      estadoCivil: v.estadoCivil || null,
      lugarNacimiento: nulo(v.lugarNacimiento),
      telefono: nulo(v.telefono),
      correo: nulo(v.correo),
      dirEstado: v.dirEstado || null,
      dirMunicipio: nulo(v.dirMunicipio),
      dirParroquia: nulo(v.dirParroquia),
      dirComunidad: nulo(v.dirComunidad),
      contactoNombre: nulo(v.contactoNombre),
      contactoParentesco: nulo(v.contactoParentesco),
      contactoTelefono: nulo(v.contactoTelefono),
      demandasFisicas: nulo(v.demandasFisicas),
      fuenteInformacion: v.fuenteInformacion,
    };
  });

  protected readonly sinDocumento = computed(() => this.datos().sinDocumento);
  protected readonly edad = computed(() => calcularEdad(this.datos().fechaNacimiento, this.ahora));
  protected readonly faltantes = computed(() => camposFaltantes(this.tipo, this.datos()));
  protected readonly faltantesResumidos = computed(() =>
    resumirFaltantes(this.tipo, this.faltantes()),
  );
  protected readonly completados = computed(() => this.total - this.faltantes().length);
  protected readonly porcentaje = computed(() =>
    Math.round((this.completados() / this.total) * 100),
  );

  /** SPEC §9.2: lo que falta para poder crear la historia (espejo del backend). */
  protected readonly erroresIdentificacion = computed<CampoIdentificacion[]>(() => {
    const d = this.datos();
    const errores: CampoIdentificacion[] = [];
    if (!d.nombre) errores.push('nombre');
    if (!d.apellido) errores.push('apellido');
    const cedulaValida = !d.cedula || /^\d{1,9}$/.test(d.cedula);
    if (this.esAdulto ? !d.nacionalidad || !d.cedula || !cedulaValida : !cedulaValida) {
      errores.push('documento');
    }
    if (d.sinDocumento && !d.fechaNacimiento) errores.push('fechaNacimiento');
    for (const campo of Object.keys(this.erroresServidor()) as CampoIdentificacion[]) {
      if (!errores.includes(campo)) errores.push(campo);
    }
    return errores;
  });

  protected readonly requisitos = computed(() => {
    const d = this.datos();
    const errores = this.intentado() ? this.erroresIdentificacion() : [];
    const item = (etiqueta: string, listo: boolean, campo: CampoIdentificacion) => {
      const estado = listo ? 'ok' : errores.includes(campo) ? 'error' : 'pendiente';
      return { etiqueta, estado, icono: estado === 'ok' ? '✓' : estado === 'error' ? '!' : '·' };
    };
    const lista = [
      item('Nombre', !!d.nombre, 'nombre'),
      item('Apellido', !!d.apellido, 'apellido'),
    ];
    if (this.esAdulto) {
      lista.push(item('Cédula (V o E + número)', !!d.nacionalidad && !!d.cedula, 'documento'));
    }
    if (d.sinDocumento) {
      lista.push(
        item('Fecha de nacimiento (sin documento)', !!d.fechaNacimiento, 'fechaNacimiento'),
      );
    }
    return lista;
  });

  protected readonly tituloValidacion = computed(() => {
    const n = this.erroresIdentificacion().length;
    return `Falta${n === 1 ? '' : 'n'} ${n} dato${n === 1 ? '' : 's'} para crear la historia`;
  });

  protected readonly textoValidacion = computed(() => {
    const nombres = this.erroresIdentificacion().map((c) => NOMBRES_FALTANTE[c]);
    const lista =
      nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0];
    const adultos = this.esAdulto ? ' En historias de adultos son obligatorios.' : '';
    return `Escribe ${lista}.${adultos} Lo demás puede quedar para después.`;
  });

  constructor() {
    const parametro = inject(ActivatedRoute).snapshot.paramMap.get('tipo');
    // La ruta solo existe para tipos válidos (ver app.routes); por defensa se
    // cae a Traumatología si alguien llega con un valor inesperado.
    this.tipo = esTipoValido(parametro) ? parametro : 'TRAUMA_ADULTO';
    this.info = TIPOS[this.tipo];
    this.esAdulto = this.tipo !== 'REHAB_INFANTIL';
    this.secciones = seccionesDe(this.tipo);
    this.total = totalExigibles(this.tipo);

    this.formulario.controls.sinDocumento.valueChanges.subscribe((marcado) => {
      const { cedula, nacionalidad } = this.formulario.controls;
      if (marcado) {
        cedula.setValue('');
        nacionalidad.setValue('');
        cedula.disable({ emitEvent: false });
        nacionalidad.disable({ emitEvent: false });
      } else {
        cedula.enable({ emitEvent: false });
        nacionalidad.enable({ emitEvent: false });
      }
    });
  }

  protected guardar(): void {
    if (this.enviando()) return;
    this.intentado.set(true);
    this.erroresServidor.set({});
    if (this.erroresIdentificacion().length > 0 || this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.errorGuardado.set(false);
    this.enviando.set(true);
    this.api.crear(this.cuerpo()).subscribe({
      next: ({ historia }) => {
        this.enviando.set(false);
        void this.router.navigate(['/historias', historia.idHistoria], {
          state: { guardada: true },
        });
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        this.manejarError(error);
      },
    });
  }

  protected abrirExistente(idHistoria: string): void {
    void this.router.navigate(['/historias', idHistoria]);
  }

  private manejarError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const id = (error.error as ErrorDuplicado | null)?.idHistoriaExistente;
      if (id) {
        this.api.obtener(id).subscribe({
          next: ({ historia }) => this.duplicada.set(historia),
          error: () => this.errorGuardado.set(true),
        });
        return;
      }
    }
    if (error instanceof HttpErrorResponse && error.status === 400) {
      const cuerpo = error.error as Partial<ErrorValidacion> | null;
      if (cuerpo?.errores?.length) {
        this.erroresServidor.set(
          Object.fromEntries(cuerpo.errores.map((e) => [e.campo, e.mensaje])),
        );
        return;
      }
    }
    this.errorGuardado.set(true);
  }

  /** Solo se envían los campos de la ficha del tipo (SPEC §9.1). */
  private cuerpo(): CrearHistoriaPayload {
    const d = this.datos();
    const cuerpo: CrearHistoriaPayload = {
      tipo: this.tipo,
      nombre: d.nombre,
      apellido: d.apellido,
      nacionalidad: d.nacionalidad,
      cedula: d.cedula,
      sinDocumento: d.sinDocumento,
    };
    for (const campo of this.secciones.flatMap((s) => s.campos)) {
      if (campo.clave in d && !['nombre', 'apellido'].includes(campo.clave)) {
        const clave = campo.clave as keyof DatosPersonales;
        (cuerpo as Record<string, unknown>)[clave] = d[clave];
      }
    }
    return cuerpo;
  }

  protected idSeccion(indice: number): string {
    return `seccion-${indice}`;
  }

  protected valor(clave: 'sexo'): string {
    return this.datos()[clave] ?? '';
  }

  protected fuenteMarcada(opcion: string): boolean {
    return this.datos().fuenteInformacion.includes(opcion);
  }

  protected alternarFuente(opcion: string): void {
    const control = this.formulario.controls.fuenteInformacion;
    const actual = control.value;
    control.setValue(
      actual.includes(opcion) ? actual.filter((o) => o !== opcion) : [...actual, opcion],
    );
  }

  protected esCompleto(campo: CampoDef): boolean {
    return (
      campo.tipo === 'documento' ||
      campo.tipo === 'sexo' ||
      campo.tipo === 'casillas' ||
      ('completo' in campo && !!campo.completo)
    );
  }

  protected obligatorio(campo: CampoDef): boolean {
    if ('obligatorio' in campo && campo.obligatorio) return true;
    return campo.clave === 'fechaNacimiento' && this.sinDocumento();
  }

  protected opciones(campo: CampoDef): readonly string[] {
    return campo.tipo === 'seleccion' ? campo.opciones : [];
  }

  protected ayuda(campo: CampoDef): string {
    return 'ayuda' in campo ? (campo.ayuda ?? '') : '';
  }

  protected placeholder(campo: CampoDef): string {
    return 'placeholder' in campo ? (campo.placeholder ?? '') : '';
  }

  protected tipoInput(campo: CampoDef): string {
    return { tel: 'tel', email: 'email', fecha: 'date' }[campo.tipo as string] ?? 'text';
  }

  protected muestraError(campo: string): boolean {
    return this.intentado() && this.erroresIdentificacion().includes(campo as CampoIdentificacion);
  }

  /** Errores de formato (teléfono, correo, fecha futura) una vez tocado el campo. */
  protected controlInvalido(clave: string): boolean {
    const control = this.formulario.get(clave);
    return !!control && control.invalid && (control.touched || this.intentado());
  }

  protected mensajeCampo(campo: CampoDef): string {
    const clave = campo.clave as CampoIdentificacion;
    if (this.muestraError(clave)) {
      return this.erroresServidor()[clave] ?? MENSAJES[clave];
    }
    if (this.controlInvalido(campo.clave)) {
      if (campo.tipo === 'fecha') return 'La fecha de nacimiento no puede ser futura.';
      if (campo.tipo === 'email') return 'El correo no tiene un formato válido.';
      if (campo.tipo === 'tel') return 'El teléfono solo admite dígitos, espacios y + ( ) -.';
    }
    return this.ayuda(campo);
  }

  protected mensajeDocumento(): string {
    if (this.muestraError('documento')) {
      return this.erroresServidor().documento ?? MENSAJES.documento;
    }
    if (this.esAdulto) {
      return 'Obligatoria para crear la historia. Nacionalidad V (venezolana) o E (extranjera).';
    }
    return this.sinDocumento()
      ? 'Podrás agregar la cédula después. Sin documento, el apellido y la fecha de nacimiento son obligatorios.'
      : 'Opcional en historias infantiles. La nacionalidad puede quedar pendiente.';
  }
}
