import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ValoracionesApi } from '../../core/valoraciones/valoraciones-api';
import type { Seccion } from '../../core/valoraciones/valoraciones.model';
import { automaticosDe, construirGrupo, datosPorSeccion, estructuraDe } from './ficha-formulario';
import { SeccionFicha } from './seccion-ficha';

type Filtro = 'todas' | 'con' | 'sin';

interface Tarjeta {
  seccion: Seccion;
  indice: number;
  nombre: string;
  datos: number;
}

/**
 * Todas las secciones de la ficha en el detalle de la historia: un índice con
 * lo que tiene cada una y un lector de solo lectura para abrirlas de una en una.
 */
@Component({
  selector: 'app-secciones-clinicas',
  imports: [RouterLink, SeccionFicha],
  templateUrl: './secciones-clinicas.html',
  styleUrl: './secciones-clinicas.css',
})
export class SeccionesClinicas {
  private readonly api = inject(ValoracionesApi);
  readonly idHistoria = input.required<string>();

  protected readonly carga = rxResource({
    params: () => this.idHistoria(),
    stream: ({ params }) => this.api.obtener(params),
  });
  protected readonly filtro = signal<Filtro>('todas');
  private readonly elegida = linkedSignal<string, number | null>({
    source: this.idHistoria,
    computation: () => null,
  });

  protected readonly respuesta = computed(() =>
    this.carga.hasValue() ? this.carga.value() : null,
  );
  protected readonly grupo = computed(() => {
    const r = this.respuesta();
    if (!r) return null;
    const grupo = construirGrupo(estructuraDe(r.ficha), r.valoracion?.contenido ?? {});
    grupo.disable({ emitEvent: false });
    return grupo;
  });
  protected readonly automaticos = computed(() =>
    automaticosDe(this.respuesta()?.valoracion ?? null),
  );
  protected readonly editable = computed(() => {
    const r = this.respuesta();
    return r?.valoracion?.estado === 'EN_CURSO' && !r.historia.archivada;
  });
  protected readonly tarjetas = computed<Tarjeta[]>(() => {
    const r = this.respuesta();
    if (!r) return [];
    const datos = datosPorSeccion(r.ficha, r.valoracion?.contenido ?? {});
    return r.ficha.secciones.map((seccion, indice) => ({
      seccion,
      indice,
      nombre: seccion.corto.replace(/^\d+\.\s*/, ''),
      datos: datos[indice] ?? 0,
    }));
  });
  protected readonly conDatos = computed(() => this.tarjetas().filter((t) => t.datos > 0).length);
  protected readonly porcentaje = computed(() => {
    const total = this.tarjetas().length;
    return total ? Math.round((this.conDatos() / total) * 100) : 0;
  });
  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    return this.tarjetas().filter(
      (t) => filtro === 'todas' || (filtro === 'con' ? t.datos > 0 : t.datos === 0),
    );
  });
  /** La elegida si sigue visible; si no, la primera con información. */
  protected readonly abierta = computed(() => {
    if (!this.respuesta()?.valoracion) return null;
    const visibles = this.visibles();
    return (
      visibles.find((t) => t.indice === this.elegida()) ??
      visibles.find((t) => t.datos > 0) ??
      visibles[0] ??
      null
    );
  });
  protected readonly anterior = computed(() => this.vecina(-1));
  protected readonly siguiente = computed(() => this.vecina(1));

  protected abrir(tarjeta: Tarjeta): void {
    this.elegida.set(tarjeta.indice);
  }

  /** En móvil el lector queda bajo el índice: se lleva la vista hasta él. */
  protected abrirDesdeIndice(tarjeta: Tarjeta): void {
    this.abrir(tarjeta);
    if (typeof window.matchMedia === 'function' && matchMedia('(max-width: 720px)').matches) {
      document.getElementById('lector-clinico')?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  protected filtrar(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  protected textoDatos(datos: number): string {
    return datos === 0 ? 'Sin llenar' : `${datos} dato${datos === 1 ? '' : 's'}`;
  }

  private vecina(paso: number): Tarjeta | null {
    const abierta = this.abierta();
    if (!abierta) return null;
    const visibles = this.visibles();
    return visibles[visibles.indexOf(abierta) + paso] ?? null;
  }
}
