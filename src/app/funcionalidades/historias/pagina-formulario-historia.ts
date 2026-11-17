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
  DatosRepresentante,
  ErrorDuplicado,
  ErrorValidacion,
  HistoriaDelPaciente,
  HistoriaDetalle,
  HistoriaResumen,
  TipoHistoria,
} from '../../core/historias/historias.model';
import {
  CAMPOS_REPRESENTANTE,
  PARENTESCOS,
  SEXOS,
  camposFaltantes,
  resumirFaltantes,
  seccionesDe,
  totalExigibles,
  type CampoDef,
  type SeccionDef,
} from './compartido/definicion-formulario';
import {
  enumerar,
  planDeAutocompletado,
  type PlanAutocompletado,
} from './compartido/autocompletado';
import { DialogoAutocompletar } from './compartido/dialogo-autocompletar';
import { DialogoDuplicado } from './compartido/dialogo-duplicado';
import { DialogoPropagar } from './compartido/dialogo-propagar';
import { filasDeCambios, type FilaCambio } from './compartido/propagacion';
import {
  TIPOS,
  calcularEdad,
  esTipoValido,
  etiquetaEstado,
  formatearDocumento,
  formatearFecha,
  formatearMomentoEnFrase,
  type InfoTipo,
} from './compartido/presentacion';

type CampoIdentificacion = ErrorValidacion['errores'][number]['campo'];

interface Propuesta {
  historia: HistoriaResumen;
  plan: PlanAutocompletado;
}

const TELEFONO = /^[\d\s+()-]*$/;

// Mensajes de B12 (los mismos que devuelve el backend, §9.2).
const MENSAJES: Record<CampoIdentificacion, string> = {
  nombre: 'Escribe el nombre. Es obligatorio para crear la historia.',
  apellido: 'Escribe el apellido. Es obligatorio para crear la historia.',
  documento:
    'Escribe la nacionalidad y el número de cédula. Son obligatorios para crear la historia.',
  fechaNacimiento: 'Escribe la fecha de nacimiento. Sin documento, es obligatoria.',
  'representante.cedula': 'La cédula del representante debe contener solo dígitos, máximo 9.',
};

const NOMBRES_FALTANTE: Record<CampoIdentificacion, string> = {
  nombre: 'el nombre',
  apellido: 'el apellido',
  documento: 'la cédula',
  fechaNacimiento: 'la fecha de nacimiento',
  'representante.cedula': 'una cédula válida del representante',
};

interface TextosFormulario {
  titulo: string;
  estado: string;
  volver: string;
  volverRuta: string;
  cancelarRuta: string;
  notaObligatorio: string;
  requisitos: string;
  pie: string;
  guardar: string;
}

/** Textos del prototipo para crear (B07) o editar (B16) una historia. */
function textosDelFormulario(historia: HistoriaDetalle | null, ahora: Date): TextosFormulario {
  if (!historia) {
    return {
      titulo: 'Nueva historia clínica',
      estado: 'Borrador',
      volver: '← Cambiar tipo de historia',
      volverRuta: '/historias/nueva',
      cancelarRuta: '/historias',
      notaObligatorio: 'Obligatorio para crear la historia. Lo demás puede completarse después.',
      requisitos: 'Para crear la historia',
      pie: 'Se guarda como borrador; puedes completarla después.',
      guardar: 'Guardar borrador',
    };
  }
  const ruta = `/historias/${historia.idHistoria}`;
  return {
    titulo: 'Editar datos personales',
    estado: etiquetaEstado(historia.estado, historia.archivada),
    volver: '← Volver a la historia',
    volverRuta: ruta,
    cancelarRuta: ruta,
    notaObligatorio: 'Obligatorio. No puede quedar vacío al guardar.',
    requisitos: 'Datos obligatorios',
    pie: `Última actualización: ${formatearMomentoEnFrase(historia.fechaActualizacion, ahora)}`,
    guardar: 'Guardar cambios',
  };
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function fechaNoFutura(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value > hoyIso() ? { futura: true } : null;
}

/** B07–B12, B19 · Nueva historia: datos personales según el tipo (SPEC §8–§9). */
@Component({
  selector: 'app-pagina-formulario-historia',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DialogoDuplicado,
    DialogoAutocompletar,
    DialogoPropagar,
  ],
  template: `
    <div class="pagina">
      <header class="cabecera">
        <a [routerLink]="textos.volverRuta" class="volver">{{ textos.volver }}</a>
        <div class="titulo">
          <h1>{{ textos.titulo }}</h1>
          <span class="hc-chip" [attr.data-estado]="textos.estado.toLowerCase()">{{
            textos.estado
          }}</span>
        </div>
        <p class="subtitulo">
          <span class="hc-punto" [attr.data-tipo]="tipo"></span>{{ info.nombre }} ·
          {{ subtitulo() }}
        </p>
      </header>

      @if (errorGuardado()) {
        <div class="hc-banner" data-variante="error" role="alert">
          <div class="hc-banner-texto">
            <strong>No pudimos guardar la historia</strong>
            <span
              >Revisa tu conexión e inténtalo de nuevo. Lo que escribiste sigue en el
              formulario.</span
            >
          </div>
          <button type="button" class="hc-banner-boton" (click)="guardar()">Reintentar</button>
        </div>
      } @else if (errorConflicto(); as mensaje) {
        <div class="hc-banner" data-variante="error" role="alert">
          <div class="hc-banner-texto">
            <strong>No pudimos guardar los cambios</strong>
            <span>{{ mensaje }}</span>
          </div>
        </div>
      } @else if (intentado() && erroresIdentificacion().length > 0) {
        <div class="hc-banner" data-variante="aviso" role="alert">
          <div class="hc-banner-texto">
            <strong>{{ tituloValidacion() }}</strong>
            <span>{{ textoValidacion() }}</span>
          </div>
        </div>
      } @else if (autocompletado(); as auto) {
        <div class="hc-banner" data-variante="auto" role="status">
          <div class="hc-banner-texto">
            <strong>Usamos los datos de su historia de {{ auto.tipoOrigen }}</strong>
            <span>{{ auto.texto }}</span>
          </div>
        </div>
      } @else if (historia && afectadas.length > 0) {
        <div class="hc-banner" data-variante="info" role="status">
          <div class="hc-banner-texto">
            <strong>Estás editando datos personales</strong>
            <span
              >Este paciente tiene
              {{ afectadas.length === 1 ? 'otra historia' : 'otras historias' }} ({{
                tiposAfectados
              }}). Al guardar te preguntaremos si quieres aplicar el cambio también allí.</span
            >
          </div>
        </div>
      } @else if (!esAdulto && !datosRepresentante()) {
        <div class="hc-banner" data-variante="aviso" role="status">
          <div class="hc-banner-texto">
            <strong>Puedes guardar sin representante</strong>
            <span
              >La historia se guardará como borrador, pero no podrás iniciar la valoración hasta
              registrar al representante.</span
            >
          </div>
        </div>
      } @else if (sinDocumento()) {
        <div class="hc-banner" data-variante="info" role="status">
          <div class="hc-banner-texto">
            <strong>Niño o niña sin documento</strong>
            <span
              >La nacionalidad quedó pendiente. Podrás agregar la cédula cuando la tenga, editando
              la historia.</span
            >
          </div>
        </div>
      }

      <div class="cuerpo">
        <form
          id="formulario-historia"
          [formGroup]="formulario"
          (ngSubmit)="guardar()"
          (focusout)="consultarCoincidencias()"
          novalidate
        >
          <p class="nota-obligatorio">
            <span class="asterisco">*</span> {{ textos.notaObligatorio }}
          </p>

          @if (!esAdulto) {
            <!-- RF-027: el representante se pide antes que los datos del niño o niña. -->
            <section
              class="seccion"
              formGroupName="representante"
              aria-labelledby="seccion-representante"
            >
              <div class="seccion-cabecera">
                <h2 id="seccion-representante">Representante</h2>
                <span class="seccion-nota seccion-nota--aviso"
                  >Obligatorio antes de iniciar la valoración</span
                >
              </div>
              <p class="seccion-descripcion">
                Empieza por los datos de quien representa al niño o niña.
              </p>
              <div class="rejilla">
                @for (campo of camposRepresentante; track campo.clave) {
                  <div class="campo">
                    <label [for]="'representante-' + campo.clave">{{ campo.etiqueta }}</label>
                    @switch (campo.tipo) {
                      @case ('parentesco') {
                        <select
                          [id]="'representante-' + campo.clave"
                          [formControlName]="campo.clave"
                        >
                          <option value="">Selecciona</option>
                          @for (p of parentescos; track p.valor) {
                            <option [value]="p.valor">{{ p.etiqueta }}</option>
                          }
                        </select>
                      }
                      @case ('seleccion') {
                        <select
                          [id]="'representante-' + campo.clave"
                          [formControlName]="campo.clave"
                        >
                          <option value="">Selecciona</option>
                          @for (opcion of campo.opciones; track opcion) {
                            <option [value]="opcion">{{ opcion }}</option>
                          }
                        </select>
                      }
                      @default {
                        <input
                          [id]="'representante-' + campo.clave"
                          [type]="campo.tipo === 'fecha' ? 'date' : 'text'"
                          [formControlName]="campo.clave"
                          [placeholder]="campo.placeholder ?? ''"
                          [attr.max]="campo.tipo === 'fecha' ? hoy : null"
                          [attr.inputmode]="campo.clave === 'cedula' ? 'numeric' : null"
                          [attr.aria-invalid]="
                            campo.clave === 'cedula' && muestraError('representante.cedula')
                          "
                          [attr.aria-describedby]="
                            campo.clave === 'cedula' ? 'representante-cedula-msg' : null
                          "
                          [class.invalido]="
                            campo.clave === 'cedula' && muestraError('representante.cedula')
                          "
                        />
                        @if (campo.clave === 'cedula' && muestraError('representante.cedula')) {
                          <span id="representante-cedula-msg" class="mensaje mensaje--error">{{
                            mensajeError('representante.cedula')
                          }}</span>
                        }
                      }
                    }
                  </div>
                  @if (campo.clave === 'fechaNacimiento') {
                    <div class="campo">
                      <label for="representante-edad">Edad</label>
                      <input
                        id="representante-edad"
                        type="text"
                        readonly
                        class="calculado"
                        placeholder="—"
                        [value]="edadRepresentante()"
                        aria-describedby="representante-edad-msg"
                      />
                      <span id="representante-edad-msg" class="mensaje"
                        >Se calcula con la fecha de nacimiento.</span
                      >
                    </div>
                  }
                }
              </div>
            </section>
          }

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
                            @if (insignia('documento'); as texto) {
                              <span class="insignia" [attr.data-insignia]="texto">{{ texto }}</span>
                            }
                          </legend>
                          <div class="documento">
                            <label for="nacionalidad" class="hc-solo-lector">Nacionalidad</label>
                            <select
                              id="nacionalidad"
                              formControlName="nacionalidad"
                              class="nacionalidad"
                              [class.invalido]="muestraError('documento')"
                              [attr.data-insignia]="insignia('documento') || null"
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
                              [attr.data-insignia]="insignia('documento') || null"
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
                          <legend>
                            Sexo
                            @if (insignia('sexo'); as texto) {
                              <span class="insignia" [attr.data-insignia]="texto">{{ texto }}</span>
                            }
                          </legend>
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
                          <label [for]="campo.clave">
                            {{ campo.etiqueta }}
                            @if (insignia(campo.clave); as texto) {
                              <span class="insignia" [attr.data-insignia]="texto">{{ texto }}</span>
                            }
                          </label>
                          <select
                            [id]="campo.clave"
                            [formControlName]="campo.clave"
                            [attr.data-insignia]="insignia(campo.clave) || null"
                          >
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
                            @if (insignia(campo.clave); as texto) {
                              <span class="insignia" [attr.data-insignia]="texto">{{ texto }}</span>
                            }
                          </label>
                          <input
                            [id]="campo.clave"
                            [type]="tipoInput(campo)"
                            [formControlName]="campo.clave"
                            [attr.data-insignia]="insignia(campo.clave) || null"
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
            <h2>{{ textos.requisitos }}</h2>
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
              {{ notaValoracion }}
            </p>
          </section>
        </aside>
      </div>

      <div class="pie">
        <span class="pie-nota">{{ textos.pie }}</span>
        <a [routerLink]="textos.cancelarRuta" class="hc-boton" data-variante="neutro">Cancelar</a>
        <button
          type="submit"
          form="formulario-historia"
          class="hc-boton"
          data-variante="primario"
          [disabled]="enviando()"
        >
          {{ enviando() ? 'Guardando…' : textos.guardar }}
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
    @if (propuesta(); as p) {
      <app-dialogo-autocompletar
        [origen]="p.historia"
        [tipoDestino]="tipo"
        [filas]="p.plan.filas"
        (usar)="usarAutocompletado()"
        (enBlanco)="propuesta.set(null)"
      />
    }
    @if (dialogoPropagar(); as estado) {
      <app-dialogo-propagar
        [paciente]="nombrePaciente()"
        [cambios]="cambios()"
        [afectadas]="afectadas"
        [fallo]="estado === 'fallo'"
        (soloEsta)="enviarEdicion(false)"
        (todas)="enviarEdicion(true)"
        (cancelar)="dialogoPropagar.set(null)"
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
  protected readonly camposRepresentante = CAMPOS_REPRESENTANTE;
  protected readonly parentescos = PARENTESCOS;
  protected readonly notaValoracion: string;
  protected readonly hoy = hoyIso();
  private readonly ahora = new Date();

  protected readonly enviando = signal(false);
  protected readonly intentado = signal(false);
  protected readonly errorGuardado = signal(false);
  protected readonly erroresServidor = signal<Partial<Record<CampoIdentificacion, string>>>({});
  protected readonly duplicada = signal<HistoriaResumen | null>(null);

  // B14/B15: autocompletado con otra historia del mismo paciente (§10.1).
  protected readonly propuesta = signal<Propuesta | null>(null);
  private readonly aplicado = signal<Propuesta | null>(null);
  private readonly autocompletados = signal<ReadonlySet<string>>(new Set());
  private ultimaConsulta: string | null = null;

  // B16–B18: edición de una historia existente.
  protected readonly historia: HistoriaDetalle | null;
  protected readonly textos: TextosFormulario;
  protected readonly afectadas: HistoriaDelPaciente[];
  protected readonly tiposAfectados: string;
  protected readonly dialogoPropagar = signal<'preguntar' | 'fallo' | null>(null);
  protected readonly errorConflicto = signal<string | null>(null);

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
    representante: this.fb.nonNullable.group({
      parentesco: [''],
      nombre: ['', [Validators.maxLength(100)]],
      apellido: ['', [Validators.maxLength(100)]],
      cedula: [''],
      fechaNacimiento: ['', [fechaNoFutura]],
      estadoCivil: [''],
      gradoInstruccion: [''],
      ocupacion: ['', [Validators.maxLength(150)]],
    }),
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

  /** SPEC §8.4: representante normalizado; sin ningún dato equivale a no tenerlo. */
  protected readonly datosRepresentante = computed<DatosRepresentante | null>(() => {
    if (this.esAdulto) return null;
    const r = {
      ...this.formulario.controls.representante.getRawValue(),
      ...this.valores().representante,
    };
    const representante: DatosRepresentante = {
      parentesco: (r.parentesco || null) as DatosRepresentante['parentesco'],
      nombre: r.nombre?.trim() || null,
      apellido: r.apellido?.trim() || null,
      cedula: r.cedula?.replace(/\D/g, '') || null,
      fechaNacimiento: r.fechaNacimiento || null,
      estadoCivil: r.estadoCivil || null,
      gradoInstruccion: r.gradoInstruccion || null,
      ocupacion: r.ocupacion?.trim() || null,
    };
    return Object.values(representante).some((valor) => valor !== null) ? representante : null;
  });

  protected readonly edadRepresentante = computed(() =>
    calcularEdad(this.datosRepresentante()?.fechaNacimiento ?? null, this.ahora),
  );

  protected readonly sinDocumento = computed(() => this.datos().sinDocumento);

  protected readonly subtitulo = computed(() => {
    const origen = this.aplicado()?.historia ?? this.historia;
    return origen
      ? `${origen.nombre} ${origen.apellido} · ${formatearDocumento(origen)}`
      : 'se guardará como borrador';
  });

  /** B17: cambios de datos compartidos respecto a lo guardado. */
  protected readonly cambios = computed<FilaCambio[]>(() =>
    this.historia ? filasDeCambios(this.tipo, this.historia.datos, this.datos()) : [],
  );

  protected readonly nombrePaciente = computed(() =>
    this.historia ? `${this.historia.nombre} ${this.historia.apellido}` : '',
  );

  /** B15: aviso de qué se copió y qué hay que completar porque no existía. */
  protected readonly autocompletado = computed(() => {
    const aplicado = this.aplicado();
    if (!aplicado) return null;
    const ausentes = aplicado.plan.ausentes;
    const resto = ausentes.length
      ? ` ${enumerar(ausentes)} no ${ausentes.length === 1 ? 'existe' : 'existen'} en esa historia: ${
          ausentes.length === 1 ? 'complétalo' : 'complétalos'
        } aquí.`
      : '';
    return {
      tipoOrigen: TIPOS[aplicado.historia.tipo].nombre,
      texto: `Los campos en verde se copiaron y puedes editarlos.${resto}`,
    };
  });
  protected readonly edad = computed(() => calcularEdad(this.datos().fechaNacimiento, this.ahora));
  protected readonly faltantes = computed(() =>
    camposFaltantes(this.tipo, this.datos(), this.datosRepresentante()),
  );
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
    const cedulaRepresentante = this.datosRepresentante()?.cedula;
    if (cedulaRepresentante && !/^\d{1,9}$/.test(cedulaRepresentante)) {
      errores.push('representante.cedula');
    }
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
    const ruta = inject(ActivatedRoute).snapshot;
    // B16: en /historias/:id/editar la historia llega resuelta (historiaResolver).
    this.historia = (ruta.data['historia'] as HistoriaDetalle | undefined) ?? null;
    const parametro = ruta.paramMap.get('tipo');
    // La ruta solo existe para tipos válidos (ver app.routes); por defensa se
    // cae a Traumatología si alguien llega con un valor inesperado.
    this.tipo = this.historia?.tipo ?? (esTipoValido(parametro) ? parametro : 'TRAUMA_ADULTO');
    this.info = TIPOS[this.tipo];
    this.esAdulto = this.tipo !== 'REHAB_INFANTIL';
    this.secciones = seccionesDe(this.tipo);
    this.total = totalExigibles(this.tipo);
    this.textos = textosDelFormulario(this.historia, this.ahora);
    // §10.2: las archivadas nunca se modifican, así que no cuentan como afectadas.
    this.afectadas = this.historia?.otrasHistorias.filter((h) => !h.archivada) ?? [];
    this.tiposAfectados = enumerar(this.afectadas.map((h) => TIPOS[h.tipo].nombre));
    this.notaValoracion =
      this.historia?.estado === 'ACTIVA'
        ? 'Esta historia está Activa: su primera valoración ya se completó. Puedes corregir los datos personales cuando lo necesites.'
        : this.esAdulto
          ? 'La primera valoración se habilita cuando los datos personales estén completos. Al completarla, la historia pasa a Activa.'
          : 'La primera valoración se habilita cuando los datos personales estén completos y el representante esté registrado.';

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

    if (this.historia) this.cargar(this.historia);
  }

  /** B16: rellena el formulario con los datos guardados (null → vacío). */
  private cargar(historia: HistoriaDetalle): void {
    const vacio = <T>(objeto: T) =>
      Object.fromEntries(
        Object.entries(objeto as object).map(([clave, valor]) => [clave, valor ?? '']),
      );
    this.formulario.patchValue({
      ...vacio(historia.datos),
      sinDocumento: historia.datos.sinDocumento,
      fuenteInformacion: historia.datos.fuenteInformacion,
      ...(historia.representante ? { representante: vacio(historia.representante) } : {}),
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
    this.errorConflicto.set(null);
    if (this.historia) {
      // RF-014/AC-010: si cambió un dato compartido y hay otras historias que
      // podrían recibirlo, se pregunta antes de guardar (B17).
      if (this.cambios().length > 0 && this.afectadas.length > 0) {
        this.dialogoPropagar.set('preguntar');
      } else {
        this.enviarEdicion(false);
      }
      return;
    }
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

  /**
   * B13/B14: al salir de un campo, si ya hay datos para identificar al
   * paciente (documento, o nombre + apellido + nacimiento sin documento), se
   * consulta una sola vez por combinación.
   */
  protected consultarCoincidencias(): void {
    // Al editar no se autocompleta: el backend valida el documento al guardar.
    if (this.historia) return;
    const d = this.datos();
    const clave =
      d.nacionalidad && d.cedula && /^\d{1,9}$/.test(d.cedula)
        ? `doc:${d.nacionalidad}${d.cedula}`
        : d.sinDocumento && d.nombre && d.apellido && d.fechaNacimiento
          ? `nom:${d.nombre}|${d.apellido}|${d.fechaNacimiento}`.toLowerCase()
          : null;
    if (!clave || clave === this.ultimaConsulta) return;
    this.ultimaConsulta = clave;

    this.api
      .coincidencias({
        tipo: this.tipo,
        nombre: d.nombre,
        apellido: d.apellido,
        nacionalidad: d.nacionalidad,
        cedula: d.cedula,
        sinDocumento: d.sinDocumento,
        fechaNacimiento: d.fechaNacimiento,
      })
      .subscribe({
        next: (r) => {
          if (r.resultado === 'duplicado') this.duplicada.set(r.historia);
          if (r.resultado === 'autocompletar' && !this.aplicado()) {
            const plan = planDeAutocompletado(
              this.tipo,
              r.historia.tipo,
              r.datos,
              formatearDocumento(r.historia),
            );
            this.propuesta.set({ historia: r.historia, plan });
          }
        },
        // Es solo una ayuda: si falla, el duplicado lo frena igual el backend al guardar.
        error: () => (this.ultimaConsulta = null),
      });
  }

  /** RF-012/RF-013: copia los datos y los deja editables, marcados en verde. */
  protected usarAutocompletado(): void {
    const propuesta = this.propuesta();
    if (!propuesta) return;
    const valores = Object.fromEntries(
      Object.entries(propuesta.plan.valores).map(([clave, valor]) => [clave, valor ?? '']),
    );
    this.formulario.patchValue(valores);
    const claves = new Set(Object.keys(valores));
    if (claves.has('cedula') || claves.has('sinDocumento')) claves.add('documento');
    this.autocompletados.set(claves);
    this.aplicado.set(propuesta);
    this.propuesta.set(null);
  }

  /** Insignia junto a la etiqueta: "Autocompletado" (B15) o "Modificado" (B16). */
  protected insignia(clave: string): string {
    if (this.autocompletados().has(clave)) return 'Autocompletado';
    return this.modificado(clave) ? 'Modificado' : '';
  }

  private modificado(clave: string): boolean {
    const original = this.historia?.datos;
    if (!original) return false;
    const actual = this.datos();
    if (clave === 'documento') {
      return (
        original.nacionalidad !== actual.nacionalidad ||
        original.cedula !== actual.cedula ||
        original.sinDocumento !== actual.sinDocumento
      );
    }
    if (!(clave in actual)) return false;
    const antes = original[clave as keyof DatosPersonales];
    const despues = actual[clave as keyof DatosPersonales];
    return Array.isArray(antes) ? antes.join() !== (despues as string[]).join() : antes !== despues;
  }

  protected abrirExistente(idHistoria: string): void {
    void this.router.navigate(['/historias', idHistoria]);
  }

  /** B16–B18: guarda la edición, solo en esta historia o también en las demás. */
  protected enviarEdicion(propagar: boolean): void {
    const historia = this.historia;
    if (!historia || this.enviando()) return;
    this.enviando.set(true);
    this.api.actualizar(historia.idHistoria, { ...this.datosAEnviar(), propagar }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.dialogoPropagar.set(null);
        void this.router.navigate(['/historias', historia.idHistoria], {
          state: { actualizada: true },
        });
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        const regla =
          error instanceof HttpErrorResponse && (error.status === 400 || error.status === 409);
        // B18: si falló la propagación no se modificó ninguna historia.
        if (propagar && !regla) {
          this.dialogoPropagar.set('fallo');
          return;
        }
        this.dialogoPropagar.set(null);
        this.manejarError(error);
      },
    });
  }

  private manejarError(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 409 && this.historia) {
      this.errorConflicto.set(
        (error.error as ErrorDuplicado | null)?.mensaje ?? 'Los datos entran en conflicto.',
      );
      return;
    }
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

  private cuerpo(): CrearHistoriaPayload {
    return { tipo: this.tipo, ...this.datosAEnviar() };
  }

  /** Solo se envían los campos de la ficha del tipo (SPEC §9.1). */
  private datosAEnviar(): Omit<CrearHistoriaPayload, 'tipo'> {
    const d = this.datos();
    const cuerpo: Omit<CrearHistoriaPayload, 'tipo'> = {
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
    if (!this.esAdulto) cuerpo.representante = this.datosRepresentante();
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
    if (this.insignia(campo.clave) === 'Modificado' && campo.tipo !== 'seleccion') {
      const antes = this.historia?.datos[campo.clave as keyof DatosPersonales];
      return `Antes: ${(campo.tipo === 'fecha' ? formatearFecha(antes as string | null) : antes) || '—'}`;
    }
    return this.ayuda(campo);
  }

  protected mensajeError(campo: CampoIdentificacion): string {
    return this.erroresServidor()[campo] ?? MENSAJES[campo];
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
