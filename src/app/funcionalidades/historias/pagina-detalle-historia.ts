import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { HistoriasApi } from '../../core/historias/historias-api';
import type {
  HistoriaDelPaciente,
  HistoriaDetalle,
  TipoHistoria,
} from '../../core/historias/historias.model';
import {
  CAMPOS_REPRESENTANTE,
  PARENTESCOS,
  SEXOS,
  resumirFaltantes,
  seccionesDe,
  type CampoDef,
} from './compartido/definicion-formulario';
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
  imports: [RouterLink],
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
            <strong>Historia archivada el {{ fecha(h.fechaArchivo) }}.</strong> Es de solo lectura.
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
              <h2 id="titulo-valoracion">Primera valoración</h2>
              @if (h.estado === 'ACTIVA') {
                <p>
                  Completada. Con ella la historia pasó a Activa. Las valoraciones se diseñan en la
                  próxima fase.
                </p>
              } @else if (razones().length > 0) {
                <p>Aún no se puede iniciar. Falta completar:</p>
                <ul class="razones">
                  @for (r of razones(); track r) {
                    <li>{{ r }}</li>
                  }
                </ul>
              } @else {
                <p>
                  Los datos personales están completos. Las valoraciones se diseñan en la próxima
                  fase.
                </p>
              }
              <button type="button" class="boton-valoracion" disabled>
                {{
                  h.estado === 'ACTIVA'
                    ? 'Ver valoración (próxima fase)'
                    : 'Iniciar primera valoración'
                }}
              </button>
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
      } @else {
        <p role="status">Cargando…</p>
      }
    </div>
  `,
  styleUrl: './pagina-detalle-historia.css',
})
export class PaginaDetalleHistoria {
  private readonly api = inject(HistoriasApi);
  private readonly ahora = new Date();

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
      ? resumirFaltantes(this.historia.value().tipo, this.historia.value().camposFaltantes)
      : [],
  );

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
    const datos: Dato[] = CAMPOS_REPRESENTANTE.map((campo) => {
      const crudo = r[campo.clave];
      const valor =
        campo.tipo === 'parentesco'
          ? (PARENTESCOS.find((p) => p.valor === crudo)?.etiqueta ?? '')
          : campo.tipo === 'fecha'
            ? formatearFecha(crudo)
            : (crudo ?? '');
      return valor
        ? { etiqueta: campo.etiqueta, valor, estado: 'lleno' }
        : { etiqueta: campo.etiqueta, valor: 'Falta', estado: 'falta' };
    });
    const edad = calcularEdad(r.fechaNacimiento, this.ahora);
    if (edad) datos.splice(5, 0, { etiqueta: 'Edad', valor: edad, estado: 'lleno' });
    return {
      titulo: 'Representante',
      datos,
      faltan: datos.filter((d) => d.estado === 'falta').length,
    };
  }

  private gruposPersonales(h: HistoriaDetalle, faltantes: Set<string>): Grupo[] {
    return seccionesDe(h.tipo).map((seccion) => {
      const datos = seccion.campos
        .filter((c) => !CAMPOS_EN_CABECERA.has(c.clave))
        .map((c) => this.dato(h, c, faltantes));
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
      default:
        return d[campo.clave] ?? '';
    }
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
