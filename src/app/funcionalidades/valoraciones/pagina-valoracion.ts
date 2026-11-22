import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { concat, defer, EMPTY, Observable, of, throwError, type Subscription } from 'rxjs';
import { last, map, switchMap, take } from 'rxjs/operators';
import { ValoracionesApi } from '../../core/valoraciones/valoraciones-api';
import type {
  ErrorCampo,
  ErrorValoracion,
  RespuestaValoracion,
} from '../../core/valoraciones/valoraciones.model';
import { DialogoHistoria } from '../historias/compartido/dialogo-historia';
import { TIPOS } from '../historias/compartido/presentacion';
import {
  automaticosDe,
  calcularImc,
  construirGrupo,
  contenidoDe,
  erroresDeFormato,
  estructuraDe,
  fechaCorta,
  hora,
  idCampo,
  ubicarCampo,
  type EstructuraFicha,
  type GrupoFicha,
} from './ficha-formulario';
import { SeccionFicha, type Automaticos } from './seccion-ficha';

/** Interrumpe el guardado (y lo que venga después) sin llamar a la API. */
class ContenidoInvalido {
  constructor(readonly errores: ErrorCampo[]) {}
}

/**
 * SPEC C §6–§11 (prototipo C1–C5): la valoración de una historia por pestañas
 * verticales, con guardado al cambiar de pestaña y con "Guardar y salir"
 * (decisión del 19-11-2026), finalización con confirmación, solo lectura e
 * impresión del navegador para las firmas.
 */
@Component({
  selector: 'app-pagina-valoracion',
  imports: [RouterLink, SeccionFicha, DialogoHistoria],
  templateUrl: './pagina-valoracion.html',
  styleUrl: './pagina-valoracion.css',
  host: { '(window:beforeunload)': 'avisarAntesDeSalir($event)' },
})
export class PaginaValoracion {
  private readonly api = inject(ValoracionesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly ruta = inject(ActivatedRoute).snapshot;
  protected readonly idHistoria = this.ruta.paramMap.get('id') ?? '';
  /** `?seccion=n` desde "Editar esta sección" del detalle; se aplica una sola vez. */
  private seccionPedida: number | null = Number(this.ruta.queryParamMap.get('seccion')) || null;

  protected readonly respuesta = signal<RespuestaValoracion | null>(null);
  protected readonly errorCarga = signal(false);
  protected readonly activa = signal(0);
  protected readonly guardando = signal(false);
  protected readonly guardadoA = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly erroresCampo = signal<Record<string, string>>({});
  /** SPEC C §13: la valoración se guardó en otra pestaña. */
  protected readonly conflicto = signal(false);
  protected readonly confirmarFinalizar = signal(false);
  protected readonly imprimiendo = signal(false);
  protected grupo: GrupoFicha | null = null;
  private estructura: EstructuraFicha | null = null;
  private suscripciones: Subscription[] = [];

  protected readonly valoracion = computed(() => this.respuesta()?.valoracion ?? null);
  protected readonly ficha = computed(() => this.respuesta()?.ficha ?? null);
  protected readonly lectura = computed(
    () => this.valoracion()?.estado === 'FINALIZADA' || !!this.respuesta()?.historia.archivada,
  );
  protected readonly tipo = computed(() => {
    const r = this.respuesta();
    return r ? TIPOS[r.historia.tipo] : null;
  });
  protected readonly lineaPaciente = computed(() => {
    const d = this.respuesta()?.datos;
    return d ? [d.nombre, d.documento, d.edad].filter(Boolean).join(' · ') : '';
  });
  protected readonly automaticos = computed<Automaticos>(() => automaticosDe(this.valoracion()));
  protected readonly finalizadaEl = computed(() => {
    const fin = this.valoracion()?.fechaFinalizacion;
    return fin ? `${fechaCorta(fin)} a las ${hora(fin)}` : '';
  });
  protected readonly anterior = computed(() => this.ficha()?.secciones[this.activa() - 1] ?? null);
  protected readonly siguiente = computed(() => this.ficha()?.secciones[this.activa() + 1] ?? null);

  constructor() {
    this.cargar();
    this.destroyRef.onDestroy(() => this.suscripciones.forEach((s) => s.unsubscribe()));
  }

  protected cargar(): void {
    this.errorCarga.set(false);
    this.conflicto.set(false);
    this.api.obtener(this.idHistoria).subscribe({
      next: (r) => this.aplicar(r, true),
      error: () => this.errorCarga.set(true),
    });
  }

  private aplicar(r: RespuestaValoracion, reconstruir: boolean): void {
    this.respuesta.set(r);
    if (!r.valoracion || !reconstruir) return;
    const pedida = this.seccionPedida;
    this.seccionPedida = null;
    if (pedida && Number.isInteger(pedida) && pedida >= 1 && pedida <= r.ficha.secciones.length) {
      this.activa.set(pedida - 1);
    }
    this.suscripciones.forEach((s) => s.unsubscribe());
    this.suscripciones = [];
    this.erroresCampo.set({});
    this.error.set(null);
    this.estructura = estructuraDe(r.ficha);
    this.grupo = construirGrupo(this.estructura, r.valoracion.contenido);
    if (this.lectura()) {
      this.grupo.disable({ emitEvent: false });
      return;
    }
    this.conectarDependencias(this.grupo, this.estructura);
    this.conectarImc(this.grupo, this.estructura);
  }

  /** RF-C10: solo las escalas marcadas como aplicadas habilitan su puntaje. */
  private conectarDependencias(grupo: GrupoFicha, estructura: EstructuraFicha): void {
    const porCasilla = new Map<string, string[]>();
    for (const [clave, casilla] of estructura.dependencias) {
      porCasilla.set(casilla, [...(porCasilla.get(casilla) ?? []), clave]);
    }
    for (const [casilla, claves] of porCasilla) {
      const aplicar = (marcada: unknown) => {
        for (const clave of claves) {
          const control = grupo.controls[clave]!;
          if (marcada === true) control.enable({ emitEvent: false });
          else {
            control.setValue('', { emitEvent: false });
            control.disable({ emitEvent: false });
          }
        }
      };
      aplicar(grupo.controls[casilla]!.value);
      this.suscripciones.push(grupo.controls[casilla]!.valueChanges.subscribe(aplicar));
    }
  }

  /**
   * RF-C08 y decisión del 19-11-2026: el IMC se recalcula al cambiar el peso o
   * la talla, salvo que el fisioterapeuta lo haya corregido a mano.
   */
  private conectarImc(grupo: GrupoFicha, estructura: EstructuraFicha): void {
    for (const [imc, [peso, talla]] of estructura.imc) {
      let calculado = calcularImc(grupo.controls[peso]!.value, grupo.controls[talla]!.value);
      const actualizar = () => {
        const nuevo = calcularImc(grupo.controls[peso]!.value, grupo.controls[talla]!.value);
        const control = grupo.controls[imc]!;
        if (control.value === '' || control.value === calculado) control.setValue(nuevo);
        calculado = nuevo;
      };
      this.suscripciones.push(
        grupo.controls[peso]!.valueChanges.subscribe(actualizar),
        grupo.controls[talla]!.valueChanges.subscribe(actualizar),
      );
    }
  }

  protected recalcularImc(imc: string): void {
    const par = this.estructura?.imc.get(imc);
    if (!par || !this.grupo) return;
    const control = this.grupo.controls[imc]!;
    control.setValue(
      calcularImc(this.grupo.controls[par[0]]!.value, this.grupo.controls[par[1]]!.value),
    );
    control.markAsDirty();
  }

  /** Guarda si hay cambios; emite la respuesta vigente (o nada si falló). */
  private guardar(): Observable<RespuestaValoracion> {
    return defer(() => {
      const r = this.respuesta();
      const grupo = this.grupo;
      if (!r?.valoracion || !grupo || this.lectura() || !grupo.dirty) return r ? of(r) : EMPTY;
      const invalidos = erroresDeFormato(this.estructura!, grupo);
      if (invalidos.length > 0) return throwError(() => new ContenidoInvalido(invalidos));
      this.guardando.set(true);
      this.error.set(null);
      return this.api.guardar(this.idHistoria, contenidoDe(grupo), r.valoracion.version).pipe(
        map((guardada) => {
          this.guardando.set(false);
          grupo.markAsPristine();
          this.aplicar(guardada, false);
          this.guardadoA.set(hora(new Date().toISOString()));
          return guardada;
        }),
      );
    });
  }

  private conManejo(flujo: Observable<unknown>, alTerminar: () => void): void {
    flujo.subscribe({
      next: () => undefined,
      complete: alTerminar,
      error: (error: unknown) => {
        this.guardando.set(false);
        if (error instanceof ContenidoInvalido) {
          this.senalarCampos(error.errores);
          return;
        }
        const cuerpo =
          error instanceof HttpErrorResponse ? (error.error as ErrorValoracion | null) : null;
        if (
          error instanceof HttpErrorResponse &&
          error.status === 409 &&
          cuerpo?.motivo === 'version'
        ) {
          this.conflicto.set(true);
          return;
        }
        if (cuerpo?.errores?.length) {
          this.senalarCampos(cuerpo.errores);
          return;
        }
        this.error.set(cuerpo?.mensaje ?? 'No se pudo guardar la valoración. Inténtalo de nuevo.');
      },
    });
  }

  /** Lleva al primer campo que impidió guardar; lo escrito sigue en el formulario. */
  private senalarCampos(errores: ErrorCampo[]): void {
    const ficha = this.ficha();
    const grupo = this.grupo;
    if (!ficha || !grupo) return;
    const [primero] = errores;
    const lugar = ubicarCampo(ficha, primero!.clave);
    const mas = errores.length - 1;
    this.error.set(
      `No se guardó. Revisa «${lugar?.etiqueta ?? primero!.clave}»` +
        `${lugar ? ` en ${lugar.seccion}` : ''}: ${primero!.mensaje}` +
        (mas > 0 ? ` Hay ${mas} campo${mas > 1 ? 's' : ''} más por corregir.` : ''),
    );
    const anteriores = this.erroresCampo();
    this.erroresCampo.set(Object.fromEntries(errores.map((e) => [e.clave, e.mensaje])));
    for (const { clave } of errores) {
      if (clave in anteriores) continue;
      const suscripcion = grupo.controls[clave]?.valueChanges
        .pipe(take(1))
        .subscribe(() => this.limpiarError(clave));
      if (suscripcion) this.suscripciones.push(suscripcion);
    }
    if (lugar) this.activa.set(lugar.indice);
    afterNextRender(
      { read: () => document.getElementById(idCampo(primero!.clave))?.focus() },
      { injector: this.injector },
    );
  }

  private limpiarError(clave: string): void {
    const restantes = { ...this.erroresCampo() };
    delete restantes[clave];
    this.erroresCampo.set(restantes);
    if (Object.keys(restantes).length === 0) this.error.set(null);
  }

  /** SPEC C §7: una pestaña por sección; lo escrito se guarda al cambiar de pestaña. */
  protected irA(indice: number): void {
    const total = this.ficha()?.secciones.length ?? 0;
    if (indice < 0 || indice >= total || indice === this.activa()) return;
    this.activa.set(indice);
    this.conManejo(this.guardar(), () => undefined);
  }

  protected teclaPestanas(evento: KeyboardEvent): void {
    const total = this.ficha()?.secciones.length ?? 0;
    const destino =
      { ArrowDown: this.activa() + 1, ArrowUp: this.activa() - 1, Home: 0, End: total - 1 }[
        evento.key
      ] ?? null;
    if (destino === null) return;
    evento.preventDefault();
    this.irA(Math.max(0, Math.min(total - 1, destino)));
    queueMicrotask(() => document.getElementById(`pestana-${this.activa()}`)?.focus());
  }

  protected guardarYSalir(): void {
    this.conManejo(
      this.guardar(),
      () => void this.router.navigate(['/historias', this.idHistoria]),
    );
  }

  protected iniciar(): void {
    this.api.iniciar(this.idHistoria).subscribe({
      next: (r) => this.aplicar(r, true),
      error: (error: unknown) => {
        const cuerpo =
          error instanceof HttpErrorResponse ? (error.error as ErrorValoracion | null) : null;
        this.error.set(cuerpo?.mensaje ?? 'No se pudo iniciar la valoración.');
      },
    });
  }

  /** RF-C12/RF-C13: con la confirmación, se guarda lo pendiente y se finaliza. */
  protected finalizar(): void {
    this.confirmarFinalizar.set(false);
    const finalizacion = concat(
      this.guardar(),
      defer(() => this.api.finalizar(this.idHistoria, this.respuesta()!.valoracion!.version)),
    ).pipe(
      last(),
      switchMap((r) => {
        this.grupo?.markAsPristine();
        this.aplicar(r, true);
        this.activa.set(0);
        return EMPTY;
      }),
    );
    this.conManejo(finalizacion, () => undefined);
  }

  /** SPEC C §11 y decisión del 19-11-2026: impresión del navegador. */
  protected imprimir(): void {
    this.imprimiendo.set(true);
    this.api.registrarImpresion(this.idHistoria).subscribe({ error: () => undefined });
    setTimeout(() => {
      window.print();
      this.imprimiendo.set(false);
    });
  }

  protected avisarAntesDeSalir(evento: BeforeUnloadEvent): void {
    if (this.grupo?.dirty && !this.lectura()) evento.preventDefault();
  }
}
