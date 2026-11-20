import type { CampoInfantil, DatosInfantiles } from '../../../core/historias/historias.model';

// SPEC B v1.6 §8.4 y prototipo B (Formulario, tipo infantil): antecedentes
// maternos, datos al nacer y exámenes realizados, con las etiquetas y el orden
// de la ficha.

export type CampoInfantilDef =
  | {
      tipo: 'texto';
      clave: CampoInfantil;
      etiqueta: string;
      placeholder?: string;
      completo?: boolean;
      ayuda?: string;
      opcional?: boolean;
    }
  | { tipo: 'numero'; clave: CampoInfantil; etiqueta: string; placeholder?: string; ayuda?: string }
  | {
      tipo: 'opciones';
      clave: CampoInfantil;
      etiqueta: string;
      opciones: readonly string[];
      completo?: boolean;
    }
  | { tipo: 'edad'; clave: 'edadCronologica' | 'edadCorregida'; etiqueta: string; ayuda: string };

export const CONTROL_PRENATAL = ['Sí', 'No'] as const;
export const ALIMENTACION = ['LME', 'LM + F', 'LM + Alimentación'] as const;

export const ANTECEDENTES_MATERNOS: readonly CampoInfantilDef[] = [
  {
    tipo: 'opciones',
    clave: 'controlPrenatal',
    etiqueta: 'Control prenatal',
    opciones: CONTROL_PRENATAL,
  },
  { tipo: 'texto', clave: 'controlPrenatalDesde', etiqueta: 'Desde', placeholder: 'Ej.: semana 8' },
  { tipo: 'numero', clave: 'gestas', etiqueta: 'Gestas' },
  { tipo: 'numero', clave: 'formulaP', etiqueta: 'P' },
  { tipo: 'numero', clave: 'formulaF', etiqueta: 'F' },
  { tipo: 'numero', clave: 'formulaC', etiqueta: 'C' },
  { tipo: 'numero', clave: 'formulaA', etiqueta: 'A' },
  {
    tipo: 'texto',
    clave: 'infeccionesUrinarias',
    etiqueta: 'Durante el embarazo: infecciones urinarias',
  },
  { tipo: 'texto', clave: 'hemorragias', etiqueta: 'Hemorragias' },
  { tipo: 'texto', clave: 'infeccionesVaginales', etiqueta: 'Infecciones vaginales' },
  { tipo: 'texto', clave: 'embarazoOtras', etiqueta: 'Otras', opcional: true, completo: true },
  { tipo: 'texto', clave: 'enfermedadBase', etiqueta: 'Enfermedad de base' },
  { tipo: 'texto', clave: 'medicamentos', etiqueta: 'Medicamentos' },
  { tipo: 'texto', clave: 'consumoAlcohol', etiqueta: 'Consumo de alcohol' },
  { tipo: 'texto', clave: 'consumoTabaco', etiqueta: 'Tabaco' },
  { tipo: 'texto', clave: 'consumoOtros', etiqueta: 'Otros', opcional: true },
  { tipo: 'texto', clave: 'tipoSangre', etiqueta: 'Tipo de sangre' },
  {
    tipo: 'texto',
    clave: 'complicacionesMaternas',
    etiqueta: 'Complicaciones',
    opcional: true,
    completo: true,
  },
];

export const DATOS_AL_NACER: readonly CampoInfantilDef[] = [
  {
    tipo: 'numero',
    clave: 'edadGestacional',
    etiqueta: 'E.G.',
    placeholder: 'semanas',
    ayuda: 'Edad gestacional al nacer, en semanas.',
  },
  {
    tipo: 'edad',
    clave: 'edadCronologica',
    etiqueta: 'Edad cronológica',
    ayuda: 'Se calcula con la F.N. Puedes corregirla.',
  },
  {
    tipo: 'edad',
    clave: 'edadCorregida',
    etiqueta: 'Edad corregida',
    ayuda: 'Se calcula con la F.N. y la E.G. Puedes corregirla.',
  },
  { tipo: 'texto', clave: 'peso', etiqueta: 'Peso', placeholder: 'kg' },
  { tipo: 'texto', clave: 'talla', etiqueta: 'Talla', placeholder: 'cm' },
  { tipo: 'texto', clave: 'respiro', etiqueta: 'Respiró' },
  { tipo: 'texto', clave: 'lloro', etiqueta: 'Lloró' },
  { tipo: 'texto', clave: 'apgar', etiqueta: 'APGAR' },
  { tipo: 'texto', clave: 'requirioO2', etiqueta: 'Requirió: O2' },
  { tipo: 'texto', clave: 'fototerapia', etiqueta: 'Fototerapia' },
  { tipo: 'texto', clave: 'transfusiones', etiqueta: 'Transfusiones', opcional: true },
  { tipo: 'texto', clave: 'sdr', etiqueta: 'Complicaciones: SDR' },
  { tipo: 'texto', clave: 'sepsisNeonatal', etiqueta: 'Sepsis neonatal' },
  { tipo: 'texto', clave: 'ictericia', etiqueta: 'Ictericia' },
  { tipo: 'texto', clave: 'anemia', etiqueta: 'Anemia' },
  { tipo: 'texto', clave: 'neonatalOtros', etiqueta: 'Otros', opcional: true, completo: true },
  { tipo: 'texto', clave: 'vacunas', etiqueta: 'Vacunas' },
  {
    tipo: 'opciones',
    clave: 'alimentacion',
    etiqueta: 'Alimentación',
    opciones: ALIMENTACION,
    completo: true,
  },
];

export const EXAMENES_REALIZADOS: readonly CampoInfantilDef[] = [
  { tipo: 'texto', clave: 'pesquisaNeonatal', etiqueta: 'Pesquisa neonatal' },
  { tipo: 'texto', clave: 'emisionesOtoacusticas', etiqueta: 'Emisiones otoacústicas' },
  { tipo: 'texto', clave: 'ecoCerebral', etiqueta: 'Eco cerebral' },
  { tipo: 'texto', clave: 'ecoAbdominal', etiqueta: 'Eco abdominal' },
  { tipo: 'texto', clave: 'evaluadoCardiologia', etiqueta: 'Evaluado por: Cardiología' },
  { tipo: 'texto', clave: 'evaluadoNeurologia', etiqueta: 'Neurología' },
  { tipo: 'texto', clave: 'evaluadoOftalmologia', etiqueta: 'Oftalmología' },
];

export const CAMPOS_INFANTILES_DEF: readonly CampoInfantilDef[] = [
  ...ANTECEDENTES_MATERNOS,
  ...DATOS_AL_NACER,
  ...EXAMENES_REALIZADOS,
];

/** Espejo de la regla del backend (RF-028): lo que no se exige para iniciar la valoración. */
export function esInfantilExigible(campo: CampoInfantilDef): boolean {
  return campo.tipo !== 'edad' && !('opcional' in campo && campo.opcional);
}

export const CLAVES_INFANTILES = CAMPOS_INFANTILES_DEF.map((c) => c.clave);

export function datosInfantilesVacios(): DatosInfantiles {
  return Object.fromEntries(CLAVES_INFANTILES.map((c) => [c, null])) as unknown as DatosInfantiles;
}

/**
 * Edad en años y meses entre `nacimiento` y `hoy` (prototipo: "1 año 3 meses",
 * "8 meses"). Con `semanasDeMenos` resta esas semanas a la fecha de hoy, para
 * la edad corregida de un prematuro.
 */
export function edadEnAniosYMeses(
  nacimiento: string | null,
  hoy: Date,
  semanasDeMenos = 0,
): string {
  if (!nacimiento) return '';
  const nacido = new Date(`${nacimiento}T00:00:00`);
  const referencia = new Date(hoy.getTime() - semanasDeMenos * 7 * 86_400_000);
  let meses =
    (referencia.getFullYear() - nacido.getFullYear()) * 12 +
    (referencia.getMonth() - nacido.getMonth());
  if (referencia.getDate() < nacido.getDate()) meses--;
  if (meses < 0) return '';
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  const textoAnios = anios ? `${anios} ${anios === 1 ? 'año' : 'años'}` : '';
  const textoMeses = resto || !anios ? `${resto} ${resto === 1 ? 'mes' : 'meses'}` : '';
  return [textoAnios, textoMeses].filter(Boolean).join(' ');
}

/** Edad cronológica (F.N.) o corregida (F.N. y E.G. < 40 semanas), sin corrección manual. */
export function edadCalculada(
  clave: 'edadCronologica' | 'edadCorregida',
  fechaNacimiento: string | null,
  edadGestacional: number | null,
  hoy: Date,
): string {
  if (clave === 'edadCronologica') return edadEnAniosYMeses(fechaNacimiento, hoy);
  return edadGestacional && edadGestacional < 40
    ? edadEnAniosYMeses(fechaNacimiento, hoy, 40 - edadGestacional)
    : '';
}
