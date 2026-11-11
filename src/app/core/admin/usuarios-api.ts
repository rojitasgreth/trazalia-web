import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { SesionPropia } from '../auth/auth.model';
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  FiltrosUsuarios,
  PaginaUsuarios,
  UsuarioAdministrado,
} from './usuarios.model';

const RUTA = '/api/v1/usuarios';

@Service()
export class UsuariosApi {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosUsuarios): Observable<PaginaUsuarios> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<PaginaUsuarios>(RUTA, { params });
  }

  obtener(idUsuario: string): Observable<{ usuario: UsuarioAdministrado }> {
    return this.http.get<{ usuario: UsuarioAdministrado }>(`${RUTA}/${idUsuario}`);
  }

  crear(datos: CrearUsuarioPayload): Observable<{ usuario: { idUsuario: string } }> {
    return this.http.post<{ usuario: { idUsuario: string } }>(RUTA, datos);
  }

  actualizar(
    idUsuario: string,
    datos: ActualizarUsuarioPayload,
  ): Observable<{ usuario: UsuarioAdministrado }> {
    return this.http.patch<{ usuario: UsuarioAdministrado }>(`${RUTA}/${idUsuario}`, datos);
  }

  suspender(idUsuario: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/${idUsuario}/suspender`, {});
  }

  reactivar(idUsuario: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/${idUsuario}/reactivar`, {});
  }

  inactivar(idUsuario: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/${idUsuario}/inactivar`, {});
  }

  reenviarInvitacion(idUsuario: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/${idUsuario}/reenviar-invitacion`, {});
  }

  sesiones(idUsuario: string): Observable<{ data: SesionPropia[] }> {
    return this.http.get<{ data: SesionPropia[] }>(`${RUTA}/${idUsuario}/sesiones`);
  }

  cerrarSesion(idUsuario: string, idSesion: string): Observable<{ estado: 'ok' }> {
    return this.http.post<{ estado: 'ok' }>(`${RUTA}/${idUsuario}/sesiones/${idSesion}/cerrar`, {});
  }
}
