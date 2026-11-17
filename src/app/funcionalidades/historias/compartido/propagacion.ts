import type { DatosPersonales, TipoHistoria } from '../../../core/historias/historias.model';
import { SEXOS, seccionesDe } from './definicion-formulario';
import { formatearDocumento, formatearFecha } from './presentacion';

/**
 * Espejo de la regla del backend (SPEC §10.2): datos personales compartidos
 * entre historias del paciente. Fuente de información y demandas físicas no
 * se comparten.
 */
const CAMPOS_COMPARTIDOS = [
  'nombre',
  'apellido',
  'nacionalidad',
  'cedula',
  'fechaNacimiento',
  'sexo',
  'dominancia',
  'ocupacion',
  'nivelEducativo',
  'estadoCivil',
  'lugarNacimiento',
  'telefono',
  'correo',
  'dirEstado',
  'dirMunicipio',
  'dirParroquia',
  'dirComunidad',
  'contactoNombre',
  'contactoParentesco',
  'contactoTelefono',
] as const satisfies readonly (keyof DatosPersonales)[];

type CampoCompartido = (typeof CAMPOS_COMPARTIDOS)[number];

/** Campos compartidos cuyo valor cambió en la edición (AC-010). */
export function camposCambiados(
  antes: DatosPersonales,
  despues: DatosPersonales,
): CampoCompartido[] {
  return CAMPOS_COMPARTIDOS.filter((campo) => antes[campo] !== despues[campo]);
}

export interface FilaCambio {
  etiqueta: string;
  antes: string;
  despues: string;
}

function mostrar(clave: CampoCompartido, datos: DatosPersonales): string {
  if (clave === 'sexo') return SEXOS.find((s) => s.valor === datos.sexo)?.etiqueta ?? '—';
  if (clave === 'fechaNacimiento') return formatearFecha(datos.fechaNacimiento) || '—';
  return datos[clave] ?? '—';
}

/** B17: "Teléfono: 0412-555-0134 → 0424-555-8890"; nacionalidad y cédula van juntas. */
export function filasDeCambios(
  tipo: TipoHistoria,
  antes: DatosPersonales,
  despues: DatosPersonales,
): FilaCambio[] {
  const etiquetas = new Map<string, string>(
    seccionesDe(tipo).flatMap((s) => s.campos.map((c) => [c.clave, c.etiqueta] as const)),
  );
  const filas: FilaCambio[] = [];
  let documento = false;
  for (const campo of camposCambiados(antes, despues)) {
    if (campo === 'nacionalidad' || campo === 'cedula') {
      if (documento) continue;
      documento = true;
      filas.push({
        etiqueta: 'Documento',
        antes: formatearDocumento(antes),
        despues: formatearDocumento(despues),
      });
      continue;
    }
    filas.push({
      etiqueta: etiquetas.get(campo) ?? campo,
      antes: mostrar(campo, antes),
      despues: mostrar(campo, despues),
    });
  }
  return filas;
}
