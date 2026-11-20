import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type {
  Bloque,
  Campo,
  Celda,
  FuenteDato,
  Seccion,
  ValorContenido,
} from '../../core/valoraciones/valoraciones.model';
import { textoDe, type GrupoFicha } from './ficha-formulario';

export interface Automaticos {
  fisioterapeuta: string;
  fechaHora: string;
  fecha: string;
}

// Barra del dolor 0–10 de la ficha infantil, de verde a rojo (SPEC C §7).
const COLORES_DOLOR = [
  '#5dbb7a',
  '#7cc47b',
  '#9ccb77',
  '#bcd06f',
  '#d9cf63',
  '#ecc25a',
  '#f0a955',
  '#ee8c4e',
  '#e46b45',
  '#c93a23',
  '#b21f1f',
];

/**
 * Una sección de la ficha (SPEC C §7–§8, prototipo C1–C5). En edición usa los
 * controles del formulario de la página; en lectura muestra los valores, con
 * una raya en los vacíos.
 */
@Component({
  selector: 'app-seccion-ficha',
  imports: [ReactiveFormsModule],
  templateUrl: './seccion-ficha.html',
  styleUrl: './seccion-ficha.css',
})
export class SeccionFicha {
  readonly seccion = input.required<Seccion>();
  readonly grupo = input.required<GrupoFicha>();
  readonly lectura = input(false);
  /** En la vista de impresión no se muestran las escalas de referencia. */
  readonly imprimir = input(false);
  readonly datos = input.required<Record<FuenteDato, string>>();
  readonly automaticos = input.required<Automaticos>();
  readonly recalcular = output<string>();

  protected readonly coloresDolor = COLORES_DOLOR;

  protected control(clave: string): FormControl<ValorContenido> {
    return this.grupo().controls[clave]!;
  }

  protected valor(clave: string): ValorContenido {
    return this.grupo().controls[clave]?.value ?? '';
  }

  protected texto(clave: string): string {
    return textoDe(this.valor(clave));
  }

  /** Id de un elemento a partir de una clave del contenido ("s3.dolor" → "campo-s3-dolor"). */
  protected idDe(clave: string): string {
    return `campo-${clave.replace(/[^\w-]/g, '-')}`;
  }

  protected dato(fuente: FuenteDato): string {
    return this.datos()[fuente] || '—';
  }

  protected marcada(clave: string, opcion: string): boolean {
    const valor = this.valor(clave);
    return Array.isArray(valor) && valor.includes(opcion);
  }

  protected alternar(clave: string, opcion: string): void {
    const control = this.control(clave);
    const actual = Array.isArray(control.value) ? control.value : [];
    control.setValue(
      actual.includes(opcion) ? actual.filter((o) => o !== opcion) : [...actual, opcion],
    );
    control.markAsDirty();
  }

  protected completo(campo: Campo): boolean {
    return (
      campo.k === 'area' ||
      campo.k === 'multiple' ||
      campo.k === 'grupo' ||
      (('completo' in campo && campo.completo) ?? false)
    );
  }

  protected columnas(bloque: Extract<Bloque, { k: 'tabla' }>): string {
    return bloque.columnas
      .map((c) => (c.ancho.endsWith('fr') ? `minmax(90px, ${c.ancho})` : c.ancho))
      .join(' ');
  }

  protected etiquetaCelda(
    bloque: Extract<Bloque, { k: 'tabla' }>,
    fila: Celda[],
    columna: number,
  ): string {
    // El encabezado de la fila: la celda destacada (instrumento del banco de
    // escalas) o, si no hay, la primera celda de texto fijo o de bandera.
    const fijas = fila.filter(
      (c): c is Extract<Celda, { k: 'fijo' | 'bandera' }> => c.k === 'fijo' || c.k === 'bandera',
    );
    const destacada = fijas.find((c) => c.k === 'fijo' && c.destacado);
    const encabezadoFila =
      (destacada ?? fijas[0])?.texto ?? `Fila ${bloque.filas.indexOf(fila) + 1}`;
    return `${bloque.columnas[columna]?.titulo || bloque.titulo}: ${encabezadoFila}`;
  }

  protected deshabilitada(celda: Celda): boolean {
    return (
      'habilitadaPor' in celda && !!celda.habilitadaPor && this.valor(celda.habilitadaPor) !== true
    );
  }

  protected colorLeyenda(color: string | undefined): string {
    return (
      { verde: '#2e9e57', 'verde-claro': '#93d16f', rojo: '#c21e1e', negro: '#15201b' }[
        color ?? ''
      ] ?? 'transparent'
    );
  }
}
