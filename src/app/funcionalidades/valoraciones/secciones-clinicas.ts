import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ValoracionesApi } from '../../core/valoraciones/valoraciones-api';
import type { Seccion } from '../../core/valoraciones/valoraciones.model';
import { datosPorSeccion } from './ficha-formulario';

type Filtro = 'todas' | 'con' | 'sin';

interface Tarjeta {
  seccion: Seccion;
  indice: number;
  nombre: string;
  datos: number;
}

/**
 * Todas las secciones de la ficha en el detalle de la historia: un índice con
 * lo que tiene cada una, cuyas tarjetas abren esa sección en la valoración.
 */
@Component({
  selector: 'app-secciones-clinicas',
  imports: [NgTemplateOutlet, RouterLink],
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

  protected readonly respuesta = computed(() =>
    this.carga.hasValue() ? this.carga.value() : null,
  );
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

  protected filtrar(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  protected textoDatos(datos: number): string {
    return datos === 0 ? 'Sin llenar' : `${datos} dato${datos === 1 ? '' : 's'}`;
  }
}
