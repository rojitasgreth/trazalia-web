import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { SesionPropia, UsuarioAutenticado } from './auth.model';

const RUTA = '/api/v1/autenticacion';

export interface IniciarSesionPayload {
  identificador: string;
  contrasena: string;
}

export interface AceptarInvitacionPayload {
  token: string;
  contrasena: string;
}

@Service()
export class AuthApi {
  private readonly http = inject(HttpClient);

  iniciarSesion(datos: IniciarSesionPayload): Observable<{ usuario: UsuarioAutenticado }> {
    return this.http.post<{ usuario: UsuarioAutenticado }>(`${RUTA}/iniciar-sesion`, datos);
  }

  /** Restaura la sesión al recargar la página: el access token es HttpOnly. */
  quienSoy(): Observable<{ usuario: UsuarioAutenticado }> {
    return this.http.get<{ usuario: UsuarioAutenticado }>(`${RUTA}/yo`);
  }

  cerrarSesion(): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/cerrar-sesion`, {});
  }

  cerrarSesiones(): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/cerrar-sesiones`, {});
  }

  renovar(): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/renovar`, {});
  }

  registrarActividad(): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/actividad`, {});
  }

  sesiones(): Observable<{ data: SesionPropia[] }> {
    return this.http.get<{ data: SesionPropia[] }>(`${RUTA}/sesiones`);
  }

  cerrarSesionPropia(idSesion: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/sesiones/${idSesion}/cerrar`, {});
  }

  aceptarInvitacion(datos: AceptarInvitacionPayload): Observable<{ estado: 'activada' }> {
    return this.http.post<{ estado: 'activada' }>(`${RUTA}/invitaciones/aceptar`, datos);
  }
}
