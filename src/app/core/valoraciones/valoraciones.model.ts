import type { Formato } from '../../compartido/formularios/formato-numerico';
import type { EstadoHistoria, TipoHistoria } from '../historias/historias.model';

// Contrato de /api/v1/historias/:id/valoracion (trazalia-api, módulo
// valoraciones; SPEC C v1.1 y ADR-0005). La ficha llega del backend: el
// frontend no duplica su definición.

export type FuenteDato =
  | 'nombre'
  | 'documento'
  | 'fechaNacimiento'
  | 'edad'
  | 'sexo'
  | 'dominancia'
  | 'ocupacion'
  | 'demandasFisicas'
  | 'telefono'
  | 'contacto'
  | 'nivelEducativo'
  | 'fuenteInformacion'
  | 'estadoCivil'
  | 'lugarNacimiento'
  | 'residencia'
  | 'nacionalidad'
  | 'contactoNombre'
  | 'contactoParentesco'
  | 'contactoTelefono';

export type { Formato };

export interface Parte {
  id: string;
  etiqueta: string;
  unidad?: string;
  tipo?: 'fecha' | 'hora';
  ancho?: number;
  formato?: Formato;
}

export type Campo =
  | { id: string; k: 'texto'; etiqueta: string; placeholder?: string; completo?: boolean }
  | { id: string; k: 'area'; etiqueta: string; placeholder?: string }
  | { id: string; k: 'numero'; etiqueta: string; unidad: string; formato?: Formato }
  | { id: string; k: 'fecha'; etiqueta: string }
  | { id: string; k: 'unica'; etiqueta: string; opciones: string[]; completo?: boolean }
  | { id: string; k: 'multiple'; etiqueta: string; opciones: string[]; otroLibre?: boolean }
  | { id: string; k: 'grupo'; etiqueta: string; partes: Parte[] }
  | { id: string; k: 'info'; etiqueta: string; fuente: FuenteDato }
  | {
      id: string;
      k: 'auto';
      etiqueta: string;
      automatico: 'fisioterapeuta' | 'fechaHora' | 'fecha';
    }
  | { id: string; k: 'imc'; etiqueta: string; ayuda: string; peso: string; talla: string };

export type Celda =
  | { k: 'fijo'; texto: string; destacado?: boolean }
  | { k: 'na' }
  | {
      k: 'texto';
      id: string;
      unidad?: string;
      placeholder?: string;
      tipo?: 'fecha';
      habilitadaPor?: string;
      formato?: Formato;
    }
  | { k: 'unica'; id: string; opciones: string[] }
  | { k: 'partes'; id: string; partes: Parte[]; habilitadaPor?: string }
  | { k: 'casilla'; id: string; etiqueta: string }
  | { k: 'bandera'; color: string; texto: string };

export interface FilaReferencia {
  celdas: string[];
  encabezado?: boolean;
  colores?: string[];
}

export type Bloque =
  | { k: 'nota'; texto: string }
  | { k: 'sub'; texto: string }
  | { k: 'campos'; campos: Campo[] }
  | {
      k: 'tabla';
      id: string;
      titulo: string;
      columnas: { titulo: string; ancho: string }[];
      filas: Celda[][];
    }
  | {
      k: 'referencia';
      titulo: string;
      especial?: 'dolor';
      filas: FilaReferencia[];
      columnas?: string;
      pie?: string;
    };

export interface Seccion {
  id: string;
  titulo: string;
  corto: string;
  bloques: Bloque[];
}

export interface Ficha {
  tipo: TipoHistoria;
  version: number;
  titulo: string;
  subtitulo: string;
  secciones: Seccion[];
  firmas: { titulo: string; quien: 'fisioterapeuta' | 'paciente'; indicacion: string }[];
}

export type ValorContenido = string | string[] | boolean;
export type Contenido = Record<string, ValorContenido>;

export interface Valoracion {
  idValoracion: string;
  estado: 'EN_CURSO' | 'FINALIZADA';
  versionFicha: number;
  version: number;
  contenido: Contenido;
  nombreFisioterapeuta: string;
  fechaInicio: string;
  fechaFinalizacion: string | null;
}

export interface RespuestaValoracion {
  historia: {
    idHistoria: string;
    tipo: TipoHistoria;
    estado: EstadoHistoria;
    archivada: boolean;
    nombre: string;
    apellido: string;
    puedeIniciarValoracion: boolean;
    camposFaltantes: string[];
  };
  valoracion: Valoracion | null;
  ficha: Ficha;
  datos: Record<FuenteDato, string>;
}

export interface ErrorCampo {
  clave: string;
  mensaje: string;
}

/** Cuerpo de un 409 (`version` u `finalizada`) o de un 400 con los campos inválidos. */
export interface ErrorValoracion {
  mensaje: string;
  motivo?: 'version' | 'finalizada';
  errores?: ErrorCampo[];
}
