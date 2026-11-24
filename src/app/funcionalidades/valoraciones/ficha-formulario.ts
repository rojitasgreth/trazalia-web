import { FormControl, FormGroup } from '@angular/forms';
import { errorDeFormato } from '../../compartido/formularios/formato-numerico';
import type {
  Contenido,
  ErrorCampo,
  Ficha,
  Formato,
  Seccion,
  Valoracion,
  ValorContenido,
} from '../../core/valoraciones/valoraciones.model';

// Formulario reactivo (Documento Cero §6) construido a partir de la definición
// de la ficha que envía la API: un control por clave del contenido.

type TipoControl = 'texto' | 'lista' | 'casilla';

export interface EstructuraFicha {
  controles: Map<string, TipoControl>;
  /** RF-C10: clave dependiente → casilla que la habilita. */
  dependencias: Map<string, string>;
  /** RF-C08: IMC → [peso, talla]. */
  imc: Map<string, [string, string]>;
  /** Claves numéricas y su formato (`null`: un número sin rango, como el IMC). */
  formatos: Map<string, Formato | null>;
}

/** Claves numéricas de unas secciones, con el formato que trae la ficha. */
export function formatosDe(secciones: Seccion[]): Map<string, Formato | null> {
  const formatos = new Map<string, Formato | null>();
  for (const bloque of secciones.flatMap((s) => s.bloques)) {
    if (bloque.k === 'campos') {
      for (const c of bloque.campos) {
        if (c.k === 'numero') formatos.set(c.id, c.formato ?? null);
        if (c.k === 'imc') formatos.set(c.id, null);
        if (c.k === 'grupo') {
          for (const p of c.partes) if (p.formato) formatos.set(`${c.id}.${p.id}`, p.formato);
        }
      }
    }
    if (bloque.k === 'tabla') {
      for (const celda of bloque.filas.flat()) {
        if (celda.k === 'texto' && celda.formato) formatos.set(celda.id, celda.formato);
        if (celda.k === 'partes') {
          for (const p of celda.partes) {
            if (p.formato || p.id === 'imc') {
              formatos.set(`${celda.id}.${p.id}`, p.formato ?? null);
            }
          }
        }
      }
    }
  }
  return formatos;
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
  return { controles, dependencias, imc, formatos: formatosDe(ficha.secciones) };
}

/** Id del elemento de una clave del contenido ("s3.dolor" → "campo-s3-dolor"). */
export function idCampo(clave: string): string {
  return `campo-${clave.replace(/[^\w-]/g, '-')}`;
}

/** Límite de los textos largos; la API aplica el mismo. */
export const MAX_TEXTO_LARGO = 1000;

/** Los números mal escritos se señalan sin ir al servidor; este sigue validando todo. */
export function erroresDeFormato(estructura: EstructuraFicha, grupo: GrupoFicha): ErrorCampo[] {
  const errores: ErrorCampo[] = [];
  for (const [clave, formato] of estructura.formatos) {
    const control = grupo.controls[clave];
    const valor = control?.enabled ? control.value : '';
    if (typeof valor !== 'string' || !valor.trim()) continue;
    const mensaje = errorDeFormato(valor.trim(), formato);
    if (mensaje) errores.push({ clave, mensaje });
  }
  return errores;
}

/** Pestaña y nombre visible de una clave, para decir qué campo hay que corregir. */
export function ubicarCampo(
  ficha: Ficha,
  clave: string,
): { indice: number; seccion: string; etiqueta: string } | null {
  const contiene = (id: string) => clave === id || clave.startsWith(`${id}.`);
  for (const [indice, seccion] of ficha.secciones.entries()) {
    const lugar = (etiqueta: string) => ({ indice, seccion: seccion.corto, etiqueta });
    for (const bloque of seccion.bloques) {
      if (bloque.k === 'campos') {
        const campo = bloque.campos.find((c) => contiene(c.id));
        if (!campo) continue;
        const parte =
          campo.k === 'grupo' ? campo.partes.find((p) => clave === `${campo.id}.${p.id}`) : null;
        return lugar(parte ? `${campo.etiqueta} · ${parte.etiqueta}` : campo.etiqueta);
      }
      if (bloque.k === 'tabla') {
        const fila = bloque.filas.find((f) => f.some((c) => 'id' in c && contiene(c.id)));
        if (!fila) continue;
        const fijo = fila.find((c) => c.k === 'fijo');
        return lugar(fijo?.k === 'fijo' ? `${bloque.titulo} · ${fijo.texto}` : bloque.titulo);
      }
    }
  }
  return null;
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

/** Cuántos datos llenos tiene cada sección de la ficha, en su orden. */
export function datosPorSeccion(ficha: Ficha, contenido: Contenido): number[] {
  const claves = Object.entries(contenido)
    .filter(([, v]) => v !== '' && v !== false && !(Array.isArray(v) && v.length === 0))
    .map(([clave]) => clave);
  return ficha.secciones.map((s) => claves.filter((c) => c.startsWith(`${s.id}.`)).length);
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/** Datos que la valoración registra sola al iniciarse (RF-C03). */
export function automaticosDe(v: Valoracion | null): {
  fisioterapeuta: string;
  fechaHora: string;
  fecha: string;
} {
  return v
    ? {
        fisioterapeuta: v.nombreFisioterapeuta,
        fechaHora: `${fechaCorta(v.fechaInicio)} ${hora(v.fechaInicio)}`,
        fecha: fechaCorta(v.fechaInicio),
      }
    : { fisioterapeuta: '', fechaHora: '', fecha: '' };
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
