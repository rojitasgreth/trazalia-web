import type {
  DatosPersonales,
  DatosRepresentante,
  TipoHistoria,
} from '../../../core/historias/historias.model';

// Listas del prototipo B (componente del formulario) y SPEC §8. Las entidades
// federales son las 24 de Venezuela (el prototipo muestra una muestra).
export const DOMINANCIAS = ['Diestro(a)', 'Zurdo(a)', 'Ambidiestro(a)'] as const;
export const NIVELES_EDUCATIVOS = [
  'Sin instrucción',
  'Primaria',
  'Bachillerato',
  'Técnico superior',
  'Universitario',
  'Postgrado',
] as const;
export const ESTADOS_CIVILES = [
  'Soltero(a)',
  'Casado(a)',
  'Unión estable',
  'Divorciado(a)',
  'Viudo(a)',
] as const;
export const FUENTES_INFORMACION = ['Paciente', 'Familiar', 'Historia', 'Mixta'] as const;
export const ENTIDADES_FEDERALES = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia',
] as const;
export const SEXOS = [
  { valor: 'FEMENINO', etiqueta: 'Femenino' },
  { valor: 'MASCULINO', etiqueta: 'Masculino' },
] as const;

/** Campos planos editables del formulario (coinciden con DatosPersonales). */
export type ClaveDato = Exclude<keyof DatosPersonales, 'nacionalidad' | 'cedula' | 'sinDocumento'>;

export type CampoDef =
  | {
      tipo: 'texto' | 'tel' | 'email' | 'fecha';
      clave: ClaveDato;
      etiqueta: string;
      obligatorio?: boolean;
      placeholder?: string;
      ayuda?: string;
      completo?: boolean;
    }
  | { tipo: 'seleccion'; clave: ClaveDato; etiqueta: string; opciones: readonly string[] }
  | { tipo: 'sexo'; clave: 'sexo'; etiqueta: string }
  | { tipo: 'casillas'; clave: 'fuenteInformacion'; etiqueta: string; ayuda: string }
  | { tipo: 'documento'; clave: 'documento'; etiqueta: string }
  | { tipo: 'edad'; clave: 'edad'; etiqueta: string };

export interface SeccionDef {
  titulo: string;
  campos: CampoDef[];
  nota?: string;
}

const TELEFONO_PH = '0412-555-0000';

function identificacion(tipo: TipoHistoria): CampoDef[] {
  const campos: CampoDef[] = [
    {
      tipo: 'texto',
      clave: 'nombre',
      etiqueta: tipo === 'REHAB_INFANTIL' ? 'Nombre del niño o niña' : 'Nombre',
      obligatorio: true,
    },
    { tipo: 'texto', clave: 'apellido', etiqueta: 'Apellido', obligatorio: true },
    { tipo: 'documento', clave: 'documento', etiqueta: 'Documento' },
    { tipo: 'fecha', clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento' },
    { tipo: 'edad', clave: 'edad', etiqueta: 'Edad' },
    { tipo: 'sexo', clave: 'sexo', etiqueta: 'Sexo' },
  ];
  if (tipo === 'NEURO_ADULTO') {
    campos.push({
      tipo: 'casillas',
      clave: 'fuenteInformacion',
      etiqueta: 'Fuente de información',
      ayuda: 'Quién aporta los datos de la historia. Puedes marcar más de una opción.',
    });
  }
  return campos;
}

const telefono: CampoDef = {
  tipo: 'tel',
  clave: 'telefono',
  etiqueta: 'Teléfono',
  placeholder: TELEFONO_PH,
};

function contacto(parentesco: string): CampoDef[] {
  return [
    { tipo: 'texto', clave: 'contactoNombre', etiqueta: 'Nombre y apellido' },
    { tipo: 'texto', clave: 'contactoParentesco', etiqueta: parentesco },
    { tipo: 'tel', clave: 'contactoTelefono', etiqueta: 'Teléfono', placeholder: TELEFONO_PH },
  ];
}

const direccion: CampoDef[] = [
  { tipo: 'seleccion', clave: 'dirEstado', etiqueta: 'Estado', opciones: ENTIDADES_FEDERALES },
  { tipo: 'texto', clave: 'dirMunicipio', etiqueta: 'Municipio' },
  { tipo: 'texto', clave: 'dirParroquia', etiqueta: 'Parroquia' },
  { tipo: 'texto', clave: 'dirComunidad', etiqueta: 'Comunidad o sector', completo: true },
];

/** SPEC §8.2–§8.5 con las secciones y textos del prototipo (B07–B10). */
export function seccionesDe(tipo: TipoHistoria): SeccionDef[] {
  switch (tipo) {
    case 'TRAUMA_ADULTO':
      return [
        { titulo: 'Identificación', campos: identificacion(tipo) },
        {
          titulo: 'Datos personales y contacto',
          campos: [
            {
              tipo: 'seleccion',
              clave: 'dominancia',
              etiqueta: 'Dominancia',
              opciones: DOMINANCIAS,
            },
            { tipo: 'texto', clave: 'ocupacion', etiqueta: 'Ocupación o deporte' },
            {
              tipo: 'texto',
              clave: 'demandasFisicas',
              etiqueta: 'Demandas físicas',
              completo: true,
              placeholder: 'Ej.: carga de peso, horas de pie, saltos, movimientos repetitivos',
              ayuda: 'Lo que le exige físicamente su trabajo o deporte.',
            },
            telefono,
          ],
        },
        {
          titulo: 'Contacto de emergencia',
          campos: contacto('Parentesco o relación'),
          nota: 'Un solo contacto',
        },
      ];
    case 'NEURO_ADULTO':
      return [
        { titulo: 'Identificación y fuente de información', campos: identificacion(tipo) },
        {
          titulo: 'Datos personales y contacto',
          campos: [
            {
              tipo: 'seleccion',
              clave: 'dominancia',
              etiqueta: 'Dominancia',
              opciones: DOMINANCIAS,
            },
            { tipo: 'texto', clave: 'ocupacion', etiqueta: 'Ocupación' },
            {
              tipo: 'seleccion',
              clave: 'nivelEducativo',
              etiqueta: 'Nivel educativo',
              opciones: NIVELES_EDUCATIVOS,
            },
            telefono,
          ],
        },
        {
          titulo: 'Cuidador o contacto',
          campos: contacto('Parentesco o relación'),
          nota: 'Un solo contacto',
        },
      ];
    case 'ADULTO_MAYOR':
      return [
        { titulo: 'Identificación', campos: identificacion(tipo) },
        {
          titulo: 'Datos personales',
          campos: [
            {
              tipo: 'seleccion',
              clave: 'estadoCivil',
              etiqueta: 'Estado civil',
              opciones: ESTADOS_CIVILES,
            },
            { tipo: 'texto', clave: 'lugarNacimiento', etiqueta: 'Lugar de nacimiento' },
            {
              tipo: 'seleccion',
              clave: 'dominancia',
              etiqueta: 'Dominancia',
              opciones: DOMINANCIAS,
            },
            { tipo: 'texto', clave: 'ocupacion', etiqueta: 'Ocupación' },
            {
              tipo: 'seleccion',
              clave: 'nivelEducativo',
              etiqueta: 'Grado de instrucción',
              opciones: NIVELES_EDUCATIVOS,
            },
            telefono,
          ],
        },
        { titulo: 'Residencia', campos: direccion },
        {
          titulo: 'Familiar de contacto',
          campos: contacto('Parentesco'),
          nota: 'Un solo contacto',
        },
      ];
    case 'REHAB_INFANTIL':
      return [
        { titulo: 'Niño o niña', campos: identificacion(tipo) },
        { titulo: 'Dirección del hogar', campos: direccion },
        {
          titulo: 'Contacto',
          campos: [
            { tipo: 'tel', clave: 'telefono', etiqueta: 'Teléfono', placeholder: TELEFONO_PH },
            {
              tipo: 'email',
              clave: 'correo',
              etiqueta: 'Correo electrónico',
              placeholder: 'correo@ejemplo.com',
            },
          ],
          nota: 'Un solo contacto',
        },
      ];
  }
}

export const PARENTESCOS = [
  { valor: 'MADRE', etiqueta: 'Madre' },
  { valor: 'PADRE', etiqueta: 'Padre' },
] as const;

export interface CampoRepresentanteDef {
  clave: keyof DatosRepresentante;
  etiqueta: string;
  tipo: 'texto' | 'fecha' | 'seleccion' | 'parentesco';
  opciones?: readonly string[];
  placeholder?: string;
}

/** SPEC §8.4 / prototipo B10: representante único, que el formulario pide primero. */
export const CAMPOS_REPRESENTANTE: readonly CampoRepresentanteDef[] = [
  { clave: 'parentesco', etiqueta: 'Parentesco', tipo: 'parentesco' },
  { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
  { clave: 'apellido', etiqueta: 'Apellido', tipo: 'texto' },
  { clave: 'cedula', etiqueta: 'Cédula', tipo: 'texto', placeholder: 'V-00000000' },
  { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha' },
  { clave: 'estadoCivil', etiqueta: 'Estado civil', tipo: 'seleccion', opciones: ESTADOS_CIVILES },
  {
    clave: 'gradoInstruccion',
    etiqueta: 'Grado de instrucción',
    tipo: 'seleccion',
    opciones: NIVELES_EDUCATIVOS,
  },
  { clave: 'ocupacion', etiqueta: 'Ocupación', tipo: 'texto' },
];

/** Campos que no cuentan para completar los datos personales. */
const NO_EXIGIBLES = new Set(['nombre', 'apellido', 'edad', 'correo']);

/** Etiqueta de un faltante tal como lo lista el prototipo (B07: "Documento o …"). */
function etiquetaFaltante(campo: CampoDef): string {
  return campo.tipo === 'documento' ? 'Documento o "Sin documento"' : campo.etiqueta;
}

/**
 * Espejo de la regla del backend (SPEC §9.1): claves de los datos que faltan
 * para completar la sección personal. El backend es la referencia; esto solo
 * alimenta el panel de progreso mientras se escribe.
 */
export function camposFaltantes(
  tipo: TipoHistoria,
  datos: DatosPersonales,
  representante: DatosRepresentante | null = null,
): string[] {
  const faltantes: string[] = [];
  // RF-015: en infantil el representante es obligatorio para completarlos.
  if (tipo === 'REHAB_INFANTIL') {
    for (const campo of CAMPOS_REPRESENTANTE) {
      if (!representante?.[campo.clave]) faltantes.push(`representante.${campo.clave}`);
    }
  }
  for (const seccion of seccionesDe(tipo)) {
    for (const campo of seccion.campos) {
      if (NO_EXIGIBLES.has(campo.clave) || campo.clave === 'edad') continue;
      if (campo.clave === 'documento') {
        if (!datos.cedula && !datos.sinDocumento) faltantes.push('documento');
        continue;
      }
      const valor = datos[campo.clave];
      if (valor === null || valor === '' || (Array.isArray(valor) && valor.length === 0)) {
        faltantes.push(campo.clave);
      }
    }
  }
  return faltantes;
}

/** Total de datos exigibles del tipo (para "17 de 18"). */
export function totalExigibles(tipo: TipoHistoria): number {
  const representante = tipo === 'REHAB_INFANTIL' ? CAMPOS_REPRESENTANTE.length : 0;
  return (
    representante +
    seccionesDe(tipo)
      .flatMap((s) => s.campos)
      .filter((c) => !NO_EXIGIBLES.has(c.clave)).length
  );
}

/**
 * Lista legible de faltantes (B07/B20): una sección con 3 o más faltantes se
 * resume como "Sección (n datos)"; más de 6 entradas se recortan a 5.
 * Las claves `representante.*` se agrupan bajo "Representante".
 */
export function resumirFaltantes(tipo: TipoHistoria, claves: readonly string[]): string[] {
  const pendientes = new Set(claves);
  const lineas: string[] = [];

  const representante = claves.filter((c) => c.startsWith('representante.'));
  if (representante.length >= 3) {
    lineas.push(`Representante (${representante.length} datos)`);
  } else {
    for (const clave of representante) {
      const campo = CAMPOS_REPRESENTANTE.find((c) => `representante.${c.clave}` === clave);
      lineas.push(`Representante: ${campo?.etiqueta.toLowerCase() ?? clave}`);
    }
  }

  for (const seccion of seccionesDe(tipo)) {
    const faltan = seccion.campos.filter((c) => pendientes.has(c.clave));
    if (faltan.length >= 3) lineas.push(`${seccion.titulo} (${faltan.length} datos)`);
    else lineas.push(...faltan.map(etiquetaFaltante));
  }

  return lineas.length > 6 ? [...lineas.slice(0, 5), `y ${lineas.length - 5} datos más`] : lineas;
}
