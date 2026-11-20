import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HistoriasApi } from '../../core/historias/historias-api';
import { ValoracionesApi } from '../../core/valoraciones/valoraciones-api';
import type {
  DatosPersonales,
  HistoriaDelPaciente,
  HistoriaDetalle,
  TipoHistoria,
} from '../../core/historias/historias.model';
import { DialogoGestion, type AccionGestion } from './compartido/dialogo-gestion';
import {
  CAMPOS_REPRESENTANTE,
  DIRECCION,
  MODALIDADES,
  PARENTESCOS,
  SEXOS,
  resumirFaltantes,
  seccionesDe,
  type CampoDef,
} from './compartido/definicion-formulario';
import { edadCalculada, type CampoInfantilDef } from './compartido/datos-infantiles';
import {
  TIPOS,
  calcularEdad,
  etiquetaEstado,
  formatearDocumento,
  formatearFecha,
  formatearMomentoEnFrase,
  iniciales,
} from './compartido/presentacion';

interface Dato {
  etiqueta: string;
  valor: string;
  estado: 'lleno' | 'falta' | 'opcional';
}

interface Grupo {
  titulo: string;
  datos: Dato[];
  faltan: number;
  sinRegistrar?: boolean;
}

const CAMPOS_EN_CABECERA = new Set(['nombre', 'apellido']);

/** B20–B24 · Detalle de una historia: datos personales y estado (SPEC §19). */
@Component({
  selector: 'app-pagina-detalle-historia',
  imports: [RouterLink, DialogoGestion],
  template: `
    <div class="pagina">
      @if (guardada()) {
        <div class="aviso-exito" role="status">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12l3 3 5-6" />
          </svg>
          @if (guardada() === 'creada') {
            <span
              ><strong>Historia guardada como borrador.</strong> Puedes completar los datos que
              faltan cuando quieras.</span
            >
          } @else {
            <span><strong>Cambios guardados.</strong></span>
          }
        </div>
      }

      @if (historia.error()) {
        <a routerLink="/historias" class="volver">← Historias clínicas</a>
        <p class="error" role="alert">{{ mensajeError() }}</p>
      } @else if (historia.hasValue()) {
        @let h = historia.value();
        @if (h.archivada) {
          <div class="aviso-archivada" role="status">
            <span
              ><strong>Historia archivada el {{ fecha(h.fechaArchivo) }}.</strong> Es de solo
              lectura. Para editarla, desarchívala.</span
            >
            <button
              type="button"
              class="hc-boton"
              data-variante="primario"
              data-tamano="compacto"
              [disabled]="procesando()"
              (click)="desarchivar(h)"
            >
              Desarchivar
            </button>
          </div>
        }

        <header class="cabecera">
          <div class="identidad">
            <a
              [routerLink]="'/historias'"
              [queryParams]="h.archivada ? { vista: 'archivadas' } : {}"
              class="volver"
              >← Historias clínicas</a
            >
            <div class="persona">
              <div class="avatar" aria-hidden="true">{{ inicialesDe(h) }}</div>
              <div class="persona-textos">
                <h1>{{ h.nombre }} {{ h.apellido }}</h1>
                <span class="linea-documento" [class.sin-documento]="!h.cedula">{{
                  lineaDocumento(h)
                }}</span>
              </div>
            </div>
            <div class="etiquetas">
              <span class="etiqueta-tipo"
                ><span class="hc-punto" [attr.data-tipo]="h.tipo"></span
                >{{ info(h.tipo).nombre }}</span
              >
              <span class="hc-chip" [attr.data-estado]="claveEstado(h)">{{ estadoDe(h) }}</span>
              <span class="fechas">{{ fechas(h) }}</span>
            </div>
          </div>
          <div class="acciones">
            @if (!h.archivada) {
              <!-- RF-018: solo el propietario edita (el backend lo garantiza). -->
              <a
                [routerLink]="['/historias', h.idHistoria, 'editar']"
                class="hc-boton"
                data-variante="secundario"
                data-tamano="compacto"
                >Editar datos personales</a
              >
              @if (h.tieneRegistrosClinicos) {
                <button
                  type="button"
                  class="hc-boton"
                  data-variante="neutro"
                  data-tamano="compacto"
                  (click)="accion.set('archivar')"
                >
                  Archivar
                </button>
              }
              <!-- §13: con registros clínicos se explica el bloqueo y se ofrece archivar (B26). -->
              <button
                type="button"
                class="hc-boton"
                data-variante="peligro-borde"
                data-tamano="compacto"
                (click)="accion.set(h.tieneRegistrosClinicos ? 'eliminarBloqueado' : 'eliminar')"
              >
                Eliminar
              </button>
            }
          </div>
        </header>

        <div class="cuerpo">
          <div class="principal">
            @for (grupo of grupos(); track grupo.titulo) {
              <section class="grupo" [attr.aria-label]="grupo.titulo">
                <div class="grupo-cabecera">
                  <h2>{{ grupo.titulo }}</h2>
                  @if (grupo.sinRegistrar) {
                    <span class="nota-aviso">Sin registrar</span>
                  } @else if (grupo.faltan > 0) {
                    <span class="nota-aviso"
                      >{{ grupo.faltan }} {{ grupo.faltan === 1 ? 'dato' : 'datos' }} por
                      completar</span
                    >
                  }
                </div>
                @if (grupo.sinRegistrar) {
                  <div class="aviso-representante">
                    <span>Registra al representante para poder iniciar la valoración.</span>
                    @if (!h.archivada) {
                      <a
                        [routerLink]="['/historias', h.idHistoria, 'editar']"
                        class="hc-boton"
                        data-variante="primario"
                        data-tamano="compacto"
                        >Agregar representante</a
                      >
                    }
                  </div>
                }
                <dl>
                  @for (d of grupo.datos; track d.etiqueta) {
                    <div>
                      <dt>{{ d.etiqueta }}</dt>
                      <dd [attr.data-estado]="d.estado">{{ d.valor }}</dd>
                    </div>
                  }
                </dl>
              </section>
            }

            <section class="futuras" aria-labelledby="titulo-futuras">
              <h2 id="titulo-futuras">Secciones clínicas</h2>
              <ul>
                @for (s of seccionesFuturas; track s) {
                  <li>
                    <span class="futura-nombre">{{ s }}</span>
                    <span class="futura-nota">Próxima fase</span>
                  </li>
                }
              </ul>
            </section>
          </div>

          <aside class="lateral">
            <section class="panel" aria-labelledby="titulo-valoracion">
              <h2 id="titulo-valoracion">Valoración</h2>
              @if (h.estado === 'ACTIVA') {
                <p>
                  Finalizada. Con ella la historia pasó a Activa. Puedes consultarla e imprimirla.
                </p>
              } @else if (h.tieneRegistrosClinicos) {
                <p>En curso. Puedes seguir llenándola donde la dejaste.</p>
              } @else if (razones().length > 0) {
                <p>Aún no se puede iniciar. Falta completar:</p>
                <ul class="razones">
                  @for (r of razones(); track r) {
                    <li>{{ r }}</li>
                  }
                </ul>
              } @else {
                <p>Los datos personales están completos: ya puedes iniciar la valoración.</p>
              }
              <!-- SPEC B v1.6 RF-030 / SPEC C §6: iniciar, continuar o ver la valoración. -->
              @if (h.estado === 'ACTIVA' || h.tieneRegistrosClinicos) {
                <a
                  class="boton-valoracion"
                  [routerLink]="['/historias', h.idHistoria, 'valoracion']"
                  >{{ h.estado === 'ACTIVA' ? 'Ver valoración' : 'Continuar valoración' }}</a
                >
              } @else {
                <button
                  type="button"
                  class="boton-valoracion"
                  [disabled]="!h.puedeIniciarValoracion || iniciando()"
                  (click)="iniciarValoracion(h.idHistoria)"
                >
                  {{ iniciando() ? 'Iniciando…' : 'Iniciar valoración' }}
                </button>
              }
              @if (errorValoracion(); as mensaje) {
                <p class="mensaje-error" role="alert">{{ mensaje }}</p>
              }
            </section>

            <section class="panel" aria-labelledby="titulo-otras">
              <h2 id="titulo-otras">Otras historias del paciente</h2>
              @for (o of h.otrasHistorias; track o.idHistoria) {
                <a class="otra" [routerLink]="['/historias', o.idHistoria]">
                  <span class="etiqueta-tipo"
                    ><span class="hc-punto" [attr.data-tipo]="o.tipo"></span
                    >{{ info(o.tipo).nombre }}</span
                  >
                  <span class="hc-chip" [attr.data-estado]="claveEstado(o)">{{ estadoDe(o) }}</span>
                </a>
              } @empty {
                <p>No tiene historias de otros tipos.</p>
              }
              <a routerLink="/historias/nueva" class="enlace-crear"
                >+ Crear historia de otro tipo</a
              >
            </section>
          </aside>
        </div>

        @if (errorAccion()) {
          <p class="error" role="alert">{{ errorAccion() }}</p>
        }
        @if (accion(); as a) {
          <app-dialogo-gestion
            [accion]="a"
            [historia]="h"
            [ocupado]="procesando()"
            (confirmar)="confirmar(a, h)"
            (cancelar)="accion.set(null)"
          />
        }
      } @else {
        <p role="status">Cargando…</p>
      }
    </div>
  `,
  styleUrl: './pagina-detalle-historia.css',
})
export class PaginaDetalleHistoria {
  private readonly api = inject(HistoriasApi);
  private readonly valoraciones = inject(ValoracionesApi);
  protected readonly iniciando = signal(false);
  protected readonly errorValoracion = signal<string | null>(null);
  private readonly router = inject(Router);
  private readonly ahora = new Date();

  // B25–B27: eliminar, archivar y desarchivar.
  protected readonly accion = signal<AccionGestion | null>(null);
  protected readonly procesando = signal(false);
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly seccionesFuturas = [
    'Anamnesis',
    'Antecedentes',
    'Valoraciones',
    'Evoluciones',
    'Documentos',
  ];

  /** B20: aviso de guardado cuando se llega desde el formulario (crear o editar). */
  protected readonly guardada = signal<'creada' | 'editada' | null>(
    ((estado) => (estado?.['guardada'] ? 'creada' : estado?.['actualizada'] ? 'editada' : null))(
      inject(Router).currentNavigation()?.extras.state,
    ),
  );

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: '' },
  );

  protected readonly historia = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.obtener(params).pipe(map((r) => r.historia)),
  });

  protected readonly grupos = computed<Grupo[]>(() =>
    this.historia.hasValue() ? this.construirGrupos(this.historia.value()) : [],
  );

  protected readonly razones = computed(() =>
    this.historia.hasValue()
      ? resumirFaltantes(
          this.historia.value().tipo,
          this.historia.value().camposFaltantes,
          this.historia.value().datos.modalidad,
        )
      : [],
  );

  protected confirmar(accion: AccionGestion, h: HistoriaDetalle): void {
    this.procesando.set(true);
    this.errorAccion.set(null);
    if (accion === 'eliminar') {
      // RF-020: borrado definitivo; se vuelve al listado.
      this.api.eliminar(h.idHistoria).subscribe({
        next: () => void this.router.navigate(['/historias']),
        error: (error: unknown) => this.fallo(error, 'No se pudo eliminar la historia.'),
      });
      return;
    }
    // B26/B27: archivar; la historia pasa al apartado de Archivadas.
    this.api.archivar(h.idHistoria).subscribe({
      next: () =>
        void this.router.navigate(['/historias'], { queryParams: { vista: 'archivadas' } }),
      error: (error: unknown) => this.fallo(error, 'No se pudo archivar la historia.'),
    });
  }

  protected desarchivar(h: HistoriaDetalle): void {
    this.procesando.set(true);
    this.errorAccion.set(null);
    this.api.desarchivar(h.idHistoria).subscribe({
      next: ({ historia }) => {
        this.procesando.set(false);
        this.historia.set(historia);
      },
      error: (error: unknown) => this.fallo(error, 'No se pudo desarchivar la historia.'),
    });
  }

  private fallo(error: unknown, porDefecto: string): void {
    this.procesando.set(false);
    this.accion.set(null);
    const mensaje =
      error instanceof HttpErrorResponse
        ? (error.error as { mensaje?: string } | null)?.mensaje
        : null;
    this.errorAccion.set(mensaje ?? porDefecto);
  }

  protected mensajeError(): string {
    const error = this.historia.error();
    return error instanceof HttpErrorResponse && error.status === 404
      ? 'No encontramos esta historia.'
      : 'No se pudo cargar la historia. Inténtalo de nuevo.';
  }

  private construirGrupos(h: HistoriaDetalle): Grupo[] {
    const faltantes = new Set(h.camposFaltantes);
    const grupos: Grupo[] = h.tipo === 'REHAB_INFANTIL' ? [this.grupoRepresentante(h)] : [];
    return grupos.concat(this.gruposPersonales(h, faltantes));
  }

  /** B22: en infantil, el representante va primero; sin registrar se avisa. */
  private grupoRepresentante(h: HistoriaDetalle): Grupo {
    const r = h.representante;
    if (!r) return { titulo: 'Representante', datos: [], faltan: 0, sinRegistrar: true };
    const faltantes = new Set(h.camposFaltantes);
    const datos: Dato[] = [];
    for (const campo of CAMPOS_REPRESENTANTE) {
      const crudo = r[campo.clave];
      const valor =
        campo.tipo === 'parentesco'
          ? (PARENTESCOS.find((p) => p.valor === crudo)?.etiqueta ?? '')
          : campo.clave === 'edad' && typeof crudo === 'number'
            ? `${crudo} ${crudo === 1 ? 'año' : 'años'}`
            : String(crudo ?? '');
      datos.push(
        valor
          ? { etiqueta: campo.etiqueta, valor, estado: 'lleno' }
          : { etiqueta: campo.etiqueta, valor: 'Falta', estado: 'falta' },
      );
      // v1.6: la dirección del hogar se registra junto al representante.
      if (campo.clave === 'estadoCivil') {
        datos.push(...DIRECCION.map((c) => this.dato(h, c, faltantes)));
      }
    }
    return {
      titulo: 'Representante',
      datos,
      faltan: datos.filter((d) => d.estado === 'falta').length,
    };
  }

  private gruposPersonales(h: HistoriaDetalle, faltantes: Set<string>): Grupo[] {
    return seccionesDe(h.tipo, h.datos.modalidad).map((seccion) => {
      const datos = [
        ...seccion.campos
          .filter((c) => !CAMPOS_EN_CABECERA.has(c.clave))
          .map((c) => this.dato(h, c, faltantes)),
        ...(seccion.infantiles ?? []).map((c) => this.datoInfantil(h, c, faltantes)),
      ];
      return {
        titulo: seccion.titulo,
        datos,
        faltan: datos.filter((d) => d.estado === 'falta').length,
      };
    });
  }

  private dato(h: HistoriaDetalle, campo: CampoDef, faltantes: Set<string>): Dato {
    const valor = this.valorDe(h, campo);
    if (valor) return { etiqueta: campo.etiqueta, valor, estado: 'lleno' };
    if (faltantes.has(campo.clave))
      return { etiqueta: campo.etiqueta, valor: 'Falta', estado: 'falta' };
    return { etiqueta: `${campo.etiqueta} (opcional)`, valor: 'No registrado', estado: 'opcional' };
  }

  /** v1.6 §8.4: antecedentes maternos, datos al nacer y exámenes. */
  private datoInfantil(h: HistoriaDetalle, campo: CampoInfantilDef, faltantes: Set<string>): Dato {
    const crudo = h.datosInfantiles?.[campo.clave] ?? null;
    const valor =
      campo.tipo === 'edad'
        ? (typeof crudo === 'string' && crudo) ||
          edadCalculada(
            campo.clave,
            h.datos.fechaNacimiento,
            h.datosInfantiles?.edadGestacional ?? null,
            this.ahora,
          )
        : crudo === null
          ? ''
          : String(crudo);
    if (valor) return { etiqueta: campo.etiqueta, valor, estado: 'lleno' };
    if (faltantes.has(`infantil.${campo.clave}`))
      return { etiqueta: campo.etiqueta, valor: 'Falta', estado: 'falta' };
    return { etiqueta: `${campo.etiqueta} (opcional)`, valor: 'No registrado', estado: 'opcional' };
  }

  private valorDe(h: HistoriaDetalle, campo: CampoDef): string {
    const d = h.datos;
    switch (campo.clave) {
      case 'documento':
        return d.cedula || d.sinDocumento ? formatearDocumento(d) : '';
      case 'edad':
        return calcularEdad(d.fechaNacimiento, this.ahora);
      case 'fechaNacimiento':
        return formatearFecha(d.fechaNacimiento);
      case 'sexo':
        return SEXOS.find((s) => s.valor === d.sexo)?.etiqueta ?? '';
      case 'fuenteInformacion':
        return d.fuenteInformacion.join(', ');
      // v1.4 §8.6/§8.7 (anexo B32).
      case 'modalidad':
        return MODALIDADES.find((m) => m.valor === d.modalidad)?.etiqueta ?? '';
      case 'idCentro':
        return h.centro
          ? `${h.centro.nombre} · ${h.centro.parroquia}, ${h.centro.municipio}, ${h.centro.estado}`
          : '';
      default:
        return (d[campo.clave as keyof DatosPersonales] as string | null) ?? '';
    }
  }

  /** SPEC C §6 pasos 1–2: crea la valoración En curso y la abre. */
  protected iniciarValoracion(idHistoria: string): void {
    this.iniciando.set(true);
    this.errorValoracion.set(null);
    this.valoraciones.iniciar(idHistoria).subscribe({
      next: () => void this.router.navigate(['/historias', idHistoria, 'valoracion']),
      error: (error: unknown) => {
        this.iniciando.set(false);
        this.errorValoracion.set(
          error instanceof HttpErrorResponse && typeof error.error?.mensaje === 'string'
            ? error.error.mensaje
            : 'No se pudo iniciar la valoración. Inténtalo de nuevo.',
        );
      },
    });
  }
  protected info(tipo: TipoHistoria) {
    return TIPOS[tipo];
  }

  protected inicialesDe(h: HistoriaDetalle): string {
    return iniciales(h.nombre, h.apellido);
  }

  protected lineaDocumento(h: HistoriaDetalle): string {
    const edad = calcularEdad(h.fechaNacimiento, this.ahora);
    return [formatearDocumento(h), edad].filter(Boolean).join(' · ');
  }

  protected estadoDe(h: Pick<HistoriaDelPaciente, 'estado' | 'archivada'>): string {
    return etiquetaEstado(h.estado, h.archivada);
  }

  protected claveEstado(h: Pick<HistoriaDelPaciente, 'estado' | 'archivada'>): string {
    return this.estadoDe(h).toLowerCase();
  }

  protected fecha(iso: string | null): string {
    return formatearFecha(iso);
  }

  protected fechas(h: HistoriaDetalle): string {
    const creada = `Creada ${formatearMomentoEnFrase(h.fechaCreacion, this.ahora)}`;
    return h.archivada && h.fechaArchivo
      ? `${creada} · Archivada ${formatearMomentoEnFrase(h.fechaArchivo, this.ahora)}`
      : `${creada} · Actualizada ${formatearMomentoEnFrase(h.fechaActualizacion, this.ahora)}`;
  }
}
