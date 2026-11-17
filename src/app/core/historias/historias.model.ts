// Contrato de /api/v1/historias (trazalia-api, módulo historias).

export type TipoHistoria = 'NEURO_ADULTO' | 'TRAUMA_ADULTO' | 'REHAB_INFANTIL' | 'ADULTO_MAYOR';
export type EstadoHistoria = 'BORRADOR' | 'ACTIVA';
export type Nacionalidad = 'V' | 'E';
export type Sexo = 'FEMENINO' | 'MASCULINO';

/** Fechas de nacimiento en ISO `AAAA-MM-DD`; vacío = null. */
export interface DatosPersonales {
  nombre: string;
  apellido: string;
  nacionalidad: Nacionalidad | null;
  cedula: string | null;
  sinDocumento: boolean;
  fechaNacimiento: string | null;
  sexo: Sexo | null;
  dominancia: string | null;
  ocupacion: string | null;
  nivelEducativo: string | null;
  estadoCivil: string | null;
  lugarNacimiento: string | null;
  telefono: string | null;
  correo: string | null;
  dirEstado: string | null;
  dirMunicipio: string | null;
  dirParroquia: string | null;
  dirComunidad: string | null;
  contactoNombre: string | null;
  contactoParentesco: string | null;
  contactoTelefono: string | null;
  demandasFisicas: string | null;
  fuenteInformacion: string[];
}

export interface DatosRepresentante {
  parentesco: 'MADRE' | 'PADRE' | null;
  nombre: string | null;
  apellido: string | null;
  cedula: string | null;
  fechaNacimiento: string | null;
  estadoCivil: string | null;
  gradoInstruccion: string | null;
  ocupacion: string | null;
}

export interface HistoriaResumen {
  idHistoria: string;
  tipo: TipoHistoria;
  estado: EstadoHistoria;
  archivada: boolean;
  nombre: string;
  apellido: string;
  nacionalidad: Nacionalidad | null;
  cedula: string | null;
  sinDocumento: boolean;
  telefono: string | null;
  fechaNacimiento: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  fechaArchivo: string | null;
}

export interface HistoriaDelPaciente {
  idHistoria: string;
  tipo: TipoHistoria;
  estado: EstadoHistoria;
  archivada: boolean;
  sinDocumento: boolean;
}

export interface HistoriaDetalle extends HistoriaResumen {
  datos: DatosPersonales;
  representante: DatosRepresentante | null;
  /** Claves de campo (`documento`, `telefono`, `representante.nombre`…). */
  camposFaltantes: string[];
  puedeIniciarValoracion: boolean;
  /** §13: con registros clínicos no se elimina; se archiva. */
  tieneRegistrosClinicos: boolean;
  otrasHistorias: HistoriaDelPaciente[];
}

export interface PaginaHistorias {
  datos: HistoriaResumen[];
  total: number;
  pagina: number;
  porPagina: number;
  conteos: { historias: number; archivadas: number };
}

export interface FiltrosHistorias {
  texto?: string;
  tipo?: TipoHistoria;
  estado?: EstadoHistoria;
  archivadas?: boolean;
  creadaDesde?: string;
  creadaHasta?: string;
  pagina?: number;
  porPagina?: number;
}

export type CrearHistoriaPayload = Partial<DatosPersonales> &
  Pick<DatosPersonales, 'nombre' | 'apellido'> & {
    tipo: TipoHistoria;
    /** Solo Rehabilitación infantil (SPEC §8.4). */
    representante?: DatosRepresentante | null;
  };

/** Cuerpo de un 409 al crear: duplicado del mismo tipo (RF-010). */
export interface ErrorDuplicado {
  mensaje: string;
  idHistoriaExistente?: string;
}

/** Cuerpo de un 400 de reglas de identificación (SPEC §9.2). */
export interface ErrorValidacion {
  mensaje: string;
  errores: {
    campo: 'nombre' | 'apellido' | 'documento' | 'fechaNacimiento' | 'representante.cedula';
    mensaje: string;
  }[];
}

/** POST /historias/coincidencias (B13/B14). */
export interface ConsultaCoincidencias {
  tipo: TipoHistoria;
  nombre?: string;
  apellido?: string;
  nacionalidad?: Nacionalidad | null;
  cedula?: string | null;
  sinDocumento?: boolean;
  fechaNacimiento?: string | null;
}

export type ResultadoCoincidencia =
  | { resultado: 'ninguna' }
  | { resultado: 'duplicado'; historia: HistoriaResumen }
  | { resultado: 'autocompletar'; historia: HistoriaResumen; datos: DatosPersonales };

/** PATCH /historias/:id (B16–B18). */
export type ActualizarHistoriaPayload = Partial<DatosPersonales> &
  Pick<DatosPersonales, 'nombre' | 'apellido'> & {
    representante?: DatosRepresentante | null;
    /** RF-014: aplicar los cambios compartidos a las demás historias no archivadas. */
    propagar: boolean;
  };
