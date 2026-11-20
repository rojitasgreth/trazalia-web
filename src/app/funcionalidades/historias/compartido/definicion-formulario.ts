import type {
  DatosInfantiles,
  DatosPersonales,
  DatosRepresentante,
  ModalidadAtencion,
  TipoHistoria,
} from '../../../core/historias/historias.model';
import {
  ANTECEDENTES_MATERNOS,
  CAMPOS_INFANTILES_DEF,
  DATOS_AL_NACER,
  esInfantilExigible,
  EXAMENES_REALIZADOS,
  type CampoInfantilDef,
} from './datos-infantiles';

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
  | { tipo: 'modalidad'; clave: 'modalidad'; etiqueta: string }
  | { tipo: 'centro'; clave: 'idCentro'; etiqueta: string }
  | { tipo: 'edad'; clave: 'edad'; etiqueta: string };

export interface SeccionDef {
  titulo: string;
  campos: CampoDef[];
  nota?: string;
  /** v1.6 §8.4: campos infantiles de la sección (grupo `datosInfantiles`). */
  infantiles?: readonly CampoInfantilDef[];
}

const TELEFONO_PH = '04125550000';

function identificacion(tipo: TipoHistoria): CampoDef[] {
  if (tipo === 'REHAB_INFANTIL') {
    // v1.6 (prototipo B): nombre, sexo y F.N.; la edad va como edad
    // cronológica, entre los datos al nacer.
    return [
      { tipo: 'texto', clave: 'nombre', etiqueta: 'Nombre del niño o niña', obligatorio: true },
      { tipo: 'texto', clave: 'apellido', etiqueta: 'Apellido', obligatorio: true },
      { tipo: 'documento', clave: 'documento', etiqueta: 'Documento' },
      { tipo: 'sexo', clave: 'sexo', etiqueta: 'Sexo' },
      { tipo: 'fecha', clave: 'fechaNacimiento', etiqueta: 'F.N. (fecha de nacimiento)' },
    ];
  }
  const campos: CampoDef[] = [
    {
      tipo: 'texto',
      clave: 'nombre',
      etiqueta: 'Nombre',
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

export const DIRECCION: CampoDef[] = [
  { tipo: 'seleccion', clave: 'dirEstado', etiqueta: 'Estado', opciones: ENTIDADES_FEDERALES },
  { tipo: 'texto', clave: 'dirMunicipio', etiqueta: 'Municipio' },
  { tipo: 'texto', clave: 'dirParroquia', etiqueta: 'Parroquia' },
  { tipo: 'texto', clave: 'dirComunidad', etiqueta: 'Comunidad o sector', completo: true },
];

/** Modalidades de atención (SPEC v1.4 §8.6, anexo B28). */
export const MODALIDADES = [
  {
    valor: 'DOMICILIO',
    etiqueta: 'A domicilio',
    descripcion: 'Te trasladas a donde vive el paciente.',
  },
  { valor: 'CENTRO', etiqueta: 'Centro médico', descripcion: 'El paciente acude a un centro.' },
] as const;

/**
 * SPEC §8.2–§8.5 y v1.4 §8.6 (anexo B28–B30): secciones del formulario según el
 * tipo y la modalidad. La modalidad va justo después de la identificación,
 * porque decide si se pide la dirección del paciente o el centro médico.
 */
export function seccionesDe(
  tipo: TipoHistoria,
  modalidad: ModalidadAtencion | null = null,
): SeccionDef[] {
  const secciones = seccionesBase(tipo);
  const extra: SeccionDef[] = [
    {
      titulo: 'Modalidad de atención',
      campos: [
        { tipo: 'modalidad', clave: 'modalidad', etiqueta: 'Modalidad de atención' },
        ...(modalidad === 'CENTRO'
          ? [{ tipo: 'centro', clave: 'idCentro', etiqueta: 'Centro médico' } as const]
          : []),
      ],
    },
  ];
  // A domicilio se necesita la dirección; Adulto mayor e Infantil ya la piden.
  const sinDireccion = tipo === 'TRAUMA_ADULTO' || tipo === 'NEURO_ADULTO';
  if (modalidad === 'DOMICILIO' && sinDireccion) {
    extra.push({ titulo: 'Dirección del paciente', campos: DIRECCION });
  }
  // En infantil la modalidad sigue a los datos del niño o niña.
  const posicion = tipo === 'REHAB_INFANTIL' ? 3 : 1;
  secciones.splice(posicion, 0, ...extra);
  return secciones;
}

function seccionesBase(tipo: TipoHistoria): SeccionDef[] {
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
        { titulo: 'Residencia', campos: DIRECCION },
        {
          titulo: 'Familiar de contacto',
          campos: contacto('Parentesco'),
          nota: 'Un solo contacto',
        },
      ];
    case 'REHAB_INFANTIL':
      // v1.6 (orden de la ficha): el representante, con su dirección, va antes
      // (lo pinta la página); luego teléfonos y correo, antecedentes maternos,
      // el niño o niña con sus datos al nacer y los exámenes realizados.
      return [
        {
          titulo: 'Teléfonos y correo',
          campos: [
            { tipo: 'tel', clave: 'telefono', etiqueta: 'Teléfonos', placeholder: TELEFONO_PH },
            {
              tipo: 'email',
              clave: 'correo',
              etiqueta: 'Correo',
              placeholder: 'correo@ejemplo.com',
            },
          ],
        },
        {
          titulo: 'Antecedentes maternos',
          campos: [],
          infantiles: ANTECEDENTES_MATERNOS,
          nota: 'Obligatorios para iniciar la valoración',
        },
        { titulo: 'Niño o niña', campos: identificacion(tipo), infantiles: DATOS_AL_NACER },
        { titulo: 'Exámenes realizados', campos: [], infantiles: EXAMENES_REALIZADOS },
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
  tipo: 'texto' | 'numero' | 'seleccion' | 'parentesco';
  opciones?: readonly string[];
  placeholder?: string;
}

/** SPEC §8.4 / prototipo B10: representante único, que el formulario pide primero. */
export const CAMPOS_REPRESENTANTE: readonly CampoRepresentanteDef[] = [
  { clave: 'parentesco', etiqueta: 'Parentesco', tipo: 'parentesco' },
  { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
  { clave: 'apellido', etiqueta: 'Apellido', tipo: 'texto' },
  { clave: 'cedula', etiqueta: 'Cédula', tipo: 'texto', placeholder: 'Número de cédula' },
  { clave: 'edad', etiqueta: 'Edad', tipo: 'numero', placeholder: 'años' },
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

function vacio(valor: unknown): boolean {
  return (
    valor === null ||
    valor === undefined ||
    valor === '' ||
    (Array.isArray(valor) && valor.length === 0)
  );
}

/** v1.6: en infantil la dirección del hogar se pide junto al representante. */
function direccionDelRepresentante(tipo: TipoHistoria): CampoDef[] {
  return tipo === 'REHAB_INFANTIL' ? DIRECCION : [];
}

/**
 * Espejo de la regla del backend (SPEC §9.1 y v1.6 RF-028): claves de los datos
 * que faltan para completar la sección personal. El backend es la referencia;
 * esto solo alimenta el panel de progreso mientras se escribe.
 */
export function camposFaltantes(
  tipo: TipoHistoria,
  datos: DatosPersonales,
  representante: DatosRepresentante | null = null,
  infantiles: DatosInfantiles | null = null,
): string[] {
  const faltantes: string[] = [];
  // RF-015: en infantil el representante es obligatorio para completarlos.
  if (tipo === 'REHAB_INFANTIL') {
    for (const campo of CAMPOS_REPRESENTANTE) {
      if (vacio(representante?.[campo.clave])) faltantes.push(`representante.${campo.clave}`);
    }
  }
  const campos = [
    ...direccionDelRepresentante(tipo),
    ...seccionesDe(tipo, datos.modalidad).flatMap((s) => s.campos),
  ];
  for (const campo of campos) {
    if (NO_EXIGIBLES.has(campo.clave)) continue;
    if (campo.clave === 'documento') {
      if (!datos.cedula && !datos.sinDocumento) faltantes.push('documento');
      continue;
    }
    if (vacio(datos[campo.clave as keyof DatosPersonales])) faltantes.push(campo.clave);
  }
  if (tipo === 'REHAB_INFANTIL') {
    for (const campo of CAMPOS_INFANTILES_DEF) {
      if (esInfantilExigible(campo) && vacio(infantiles?.[campo.clave])) {
        faltantes.push(`infantil.${campo.clave}`);
      }
    }
  }
  return faltantes;
}

/** Total de datos exigibles del tipo (para "17 de 18"). */
export function totalExigibles(
  tipo: TipoHistoria,
  modalidad: ModalidadAtencion | null = null,
): number {
  const infantil = tipo === 'REHAB_INFANTIL';
  const representante = infantil ? CAMPOS_REPRESENTANTE.length : 0;
  const infantiles = infantil ? CAMPOS_INFANTILES_DEF.filter(esInfantilExigible).length : 0;
  return (
    representante +
    infantiles +
    [
      ...direccionDelRepresentante(tipo),
      ...seccionesDe(tipo, modalidad).flatMap((s) => s.campos),
    ].filter((c) => !NO_EXIGIBLES.has(c.clave)).length
  );
}

function resumir(titulo: string, etiquetas: string[], lineas: string[]): void {
  if (etiquetas.length >= 3) lineas.push(`${titulo} (${etiquetas.length} datos)`);
  else lineas.push(...etiquetas);
}

/**
 * Lista legible de faltantes (B07/B20): una sección con 3 o más faltantes se
 * resume como "Sección (n datos)"; más de 6 entradas se recortan a 5.
 * El representante y su dirección se agrupan bajo "Representante".
 */
export function resumirFaltantes(
  tipo: TipoHistoria,
  claves: readonly string[],
  modalidad: ModalidadAtencion | null = null,
): string[] {
  const pendientes = new Set(claves);
  const lineas: string[] = [];

  const representante = [
    ...CAMPOS_REPRESENTANTE.filter((c) => pendientes.has(`representante.${c.clave}`)).map(
      (c) => `Representante: ${c.etiqueta.toLowerCase()}`,
    ),
    ...direccionDelRepresentante(tipo)
      .filter((c) => pendientes.has(c.clave))
      .map((c) => `Dirección: ${c.etiqueta.toLowerCase()}`),
  ];
  resumir('Representante', representante, lineas);

  for (const seccion of seccionesDe(tipo, modalidad)) {
    const etiquetas = [
      ...seccion.campos.filter((c) => pendientes.has(c.clave)).map(etiquetaFaltante),
      ...(seccion.infantiles ?? [])
        .filter((c) => pendientes.has(`infantil.${c.clave}`))
        .map((c) => c.etiqueta),
    ];
    resumir(seccion.titulo, etiquetas, lineas);
  }

  return lineas.length > 6 ? [...lineas.slice(0, 5), `y ${lineas.length - 5} datos más`] : lineas;
}
