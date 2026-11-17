// Contrato de /api/v1/centros (catálogo compartido de centros médicos, SPEC B v1.4 §8.7).

export interface CentroMedico {
  idCentro: string;
  nombre: string;
  estado: string;
  municipio: string;
  parroquia: string;
  comunidad: string | null;
}

export interface NuevoCentroPayload {
  nombre: string;
  dirEstado: string;
  dirMunicipio: string;
  dirParroquia: string;
  dirComunidad?: string | null;
}

/** Cuerpo del 409 al crear: el centro ya existe y se ofrece usarlo. */
export interface ErrorCentroExistente {
  mensaje: string;
  centro: CentroMedico;
}
