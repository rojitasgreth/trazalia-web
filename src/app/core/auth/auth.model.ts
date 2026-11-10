export type RolUsuario = 'ADMINISTRADOR' | 'FISIOTERAPEUTA';

export interface UsuarioAutenticado {
  idUsuario: string;
  correo: string;
  nombreUsuario: string;
  nombre: string;
  apellido: string;
  rol: RolUsuario;
}

export interface SesionPropia {
  idSesion: string;
  etiquetaDispositivo: string | null;
  fechaCreacion: string;
  ultimaActividad: string;
}
