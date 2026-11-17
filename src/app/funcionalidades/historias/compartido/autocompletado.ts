import type { DatosPersonales, TipoHistoria } from '../../../core/historias/historias.model';
import { SEXOS, seccionesDe, type ClaveDato } from './definicion-formulario';
import { formatearFecha } from './presentacion';

export interface FilaAutocompletado {
  etiqueta: string;
  valor: string;
  /** false: el dato no existe en la historia de origen y hay que completarlo. */
  existe: boolean;
}

export interface PlanAutocompletado {
  /** Valores a copiar en el formulario del nuevo tipo. */
  valores: Partial<DatosPersonales>;
  /** Resumen para el diálogo B14. */
  filas: FilaAutocompletado[];
  /** Etiquetas de los datos del nuevo tipo que la historia de origen no tiene. */
  ausentes: string[];
}

const IDENTIFICACION = new Set(['nombre', 'apellido', 'documento', 'edad']);

function clavesDe(tipo: TipoHistoria): Set<string> {
  return new Set(seccionesDe(tipo).flatMap((s) => s.campos.map((c) => c.clave)));
}

function texto(clave: ClaveDato, datos: DatosPersonales): string {
  const valor = datos[clave];
  if (clave === 'sexo') return SEXOS.find((s) => s.valor === valor)?.etiqueta ?? '';
  if (clave === 'fechaNacimiento') return formatearFecha(datos.fechaNacimiento);
  if (Array.isArray(valor)) return valor.join(', ');
  return valor ?? '';
}

/**
 * SPEC §10.1: copia los datos personales coincidentes de otra historia del
 * mismo paciente. Solo se copian los campos que existen en ambos tipos; los
 * del nuevo tipo que no existen en el origen quedan vacíos (RF-012/RF-013).
 */
export function planDeAutocompletado(
  tipoDestino: TipoHistoria,
  tipoOrigen: TipoHistoria,
  datos: DatosPersonales,
  documento: string,
): PlanAutocompletado {
  const enOrigen = clavesDe(tipoOrigen);
  const valores: Partial<DatosPersonales> = {
    nombre: datos.nombre,
    apellido: datos.apellido,
    nacionalidad: datos.nacionalidad,
    cedula: datos.cedula,
    sinDocumento: datos.sinDocumento,
  };
  const filas: FilaAutocompletado[] = [
    { etiqueta: 'Nombre y apellido', valor: `${datos.nombre} ${datos.apellido}`, existe: true },
    { etiqueta: 'Documento', valor: documento, existe: true },
  ];
  const ausentes: string[] = [];

  for (const campo of seccionesDe(tipoDestino).flatMap((s) => s.campos)) {
    if (IDENTIFICACION.has(campo.clave)) continue;
    const clave = campo.clave as ClaveDato;
    if (!enOrigen.has(clave)) {
      ausentes.push(campo.etiqueta);
      filas.push({ etiqueta: campo.etiqueta, valor: 'No existe en esa historia', existe: false });
      continue;
    }
    const valor = texto(clave, datos);
    if (!valor) continue;
    (valores as Record<string, unknown>)[clave] = datos[clave];
    filas.push({ etiqueta: campo.etiqueta, valor, existe: true });
  }
  return { valores, filas, ausentes };
}

/** "a", "a y b", "a, b y c" */
export function enumerar(elementos: readonly string[]): string {
  return elementos.length > 1
    ? `${elementos.slice(0, -1).join(', ')} y ${elementos.at(-1)}`
    : (elementos[0] ?? '');
}
