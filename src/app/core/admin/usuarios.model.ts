import type { RolUsuario } from '../auth/auth.model';

export type EstadoCuenta = 'PENDIENTE' | 'ACTIVO' | 'BLOQUEADO' | 'SUSPENDIDO' | 'INACTIVO';

export interface UsuarioAdministrado {
  idUsuario: string;
  nacionalidad: 'V' | 'E';
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string | null;
  nombreUsuario: string;
  rol: RolUsuario;
  estado: EstadoCuenta;
  fechaCreacion: string;
  fechaActivacion: string | null;
  ultimoAcceso: string | null;
}

export interface PaginaUsuarios {
  datos: UsuarioAdministrado[];
  total: number;
  pagina: number;
  porPagina: number;
}

export interface FiltrosUsuarios {
  texto?: string;
  rol?: RolUsuario;
  estado?: EstadoCuenta;
  pagina?: number;
  porPagina?: number;
}

export interface CrearUsuarioPayload {
  nacionalidad: 'V' | 'E';
  cedula: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rol: RolUsuario;
}

export interface ActualizarUsuarioPayload {
  nombre?: string;
  apellido?: string;
  telefono?: string | null;
  correo?: string;
  rol?: RolUsuario;
}
