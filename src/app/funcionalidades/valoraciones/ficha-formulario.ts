import { FormControl, FormGroup } from '@angular/forms';
import type { Contenido, Ficha, ValorContenido } from '../../core/valoraciones/valoraciones.model';

// Formulario reactivo (Documento Cero §6) construido a partir de la definición
// de la ficha que envía la API: un control por clave del contenido.

type TipoControl = 'texto' | 'lista' | 'casilla';

export interface EstructuraFicha {
  controles: Map<string, TipoControl>;
  /** RF-C10: clave dependiente → casilla que la habilita. */
  dependencias: Map<string, string>;
  /** RF-C08: IMC → [peso, talla]. */
  imc: Map<string, [string, string]>;
}

export function estructuraDe(ficha: Ficha): EstructuraFicha {
  const controles = new Map<string, TipoControl>();
  const dependencias = new Map<string, string>();
  const imc = new Map<string, [string, string]>();
  for (const seccion of ficha.secciones) {
    for (const bloque of seccion.bloques) {
      if (bloque.k === 'campos') {
        for (const c of bloque.campos) {
          if (c.k === 'info' || c.k === 'auto') continue;
          if (c.k === 'multiple') {
            controles.set(c.id, 'lista');
            if (c.otroLibre) controles.set(`${c.id}.otro`, 'texto');
          } else if (c.k === 'grupo') {
            for (const p of c.partes) controles.set(`${c.id}.${p.id}`, 'texto');
          } else {
            controles.set(c.id, 'texto');
            if (c.k === 'imc') imc.set(c.id, [c.peso, c.talla]);
          }
        }
      }
      if (bloque.k === 'tabla') {
        for (const celda of bloque.filas.flat()) {
          if (celda.k === 'casilla') controles.set(celda.id, 'casilla');
          if (celda.k === 'texto' || celda.k === 'unica') controles.set(celda.id, 'texto');
          if (celda.k === 'texto' && celda.habilitadaPor)
            dependencias.set(celda.id, celda.habilitadaPor);
          if (celda.k === 'partes') {
            for (const p of celda.partes) {
              const clave = `${celda.id}.${p.id}`;
              controles.set(clave, 'texto');
              if (celda.habilitadaPor) dependencias.set(clave, celda.habilitadaPor);
            }
            // Traumatología §5: Peso/talla/IMC en una celda de tres partes.
            if (celda.partes.some((p) => p.id === 'imc')) {
              imc.set(`${celda.id}.imc`, [`${celda.id}.p1`, `${celda.id}.p2`]);
            }
          }
        }
      }
    }
  }
  return { controles, dependencias, imc };
}

export type GrupoFicha = FormGroup<Record<string, FormControl<ValorContenido>>>;

export function construirGrupo(estructura: EstructuraFicha, contenido: Contenido): GrupoFicha {
  const controles: Record<string, FormControl<ValorContenido>> = {};
  for (const [clave, tipo] of estructura.controles) {
    const inicial = tipo === 'lista' ? [] : tipo === 'casilla' ? false : '';
    controles[clave] = new FormControl<ValorContenido>(contenido[clave] ?? inicial, {
      nonNullable: true,
    });
  }
  return new FormGroup(controles);
}

/** Contenido a guardar: sin vacíos (el backend también los descarta). */
export function contenidoDe(grupo: GrupoFicha): Contenido {
  const contenido: Contenido = {};
  for (const [clave, valor] of Object.entries(grupo.getRawValue())) {
    if (valor === '' || valor === false || (Array.isArray(valor) && valor.length === 0)) continue;
    contenido[clave] = typeof valor === 'string' ? valor.trim() : valor;
  }
  return contenido;
}

function numero(texto: unknown): number | null {
  if (typeof texto !== 'string' || !texto.trim()) return null;
  const valor = Number(texto.replace(',', '.'));
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

/** RF-C08: IMC = peso (kg) / talla (m)²; con una decimal y coma, como la ficha ("25,2"). */
export function calcularImc(peso: unknown, tallaCm: unknown): string {
  const kg = numero(peso);
  const cm = numero(tallaCm);
  if (!kg || !cm) return '';
  return (kg / (cm / 100) ** 2).toFixed(1).replace('.', ',');
}

/** Texto de un valor guardado para la solo lectura (SPEC C §11: vacío = raya). */
export function textoDe(valor: ValorContenido | undefined): string {
  if (valor === undefined || valor === '' || valor === false) return '—';
  if (valor === true) return 'Sí';
  if (Array.isArray(valor)) return valor.length ? valor.join(', ') : '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split('-');
    return `${d}/${m}/${a}`;
  }
  return valor;
}
