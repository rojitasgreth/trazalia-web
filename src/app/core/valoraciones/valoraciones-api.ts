import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Contenido, RespuestaValoracion } from './valoraciones.model';

const ruta = (idHistoria: string) => `/api/v1/historias/${idHistoria}/valoracion`;

@Service()
export class ValoracionesApi {
  private readonly http = inject(HttpClient);

  obtener(idHistoria: string): Observable<RespuestaValoracion> {
    return this.http.get<RespuestaValoracion>(ruta(idHistoria));
  }

  iniciar(idHistoria: string): Observable<RespuestaValoracion> {
    return this.http.post<RespuestaValoracion>(ruta(idHistoria), {});
  }

  guardar(
    idHistoria: string,
    contenido: Contenido,
    version: number,
  ): Observable<RespuestaValoracion> {
    return this.http.put<RespuestaValoracion>(ruta(idHistoria), { contenido, version });
  }

  finalizar(idHistoria: string, version: number): Observable<RespuestaValoracion> {
    return this.http.post<RespuestaValoracion>(`${ruta(idHistoria)}/finalizar`, { version });
  }

  registrarImpresion(idHistoria: string): Observable<void> {
    return this.http.post<void>(`${ruta(idHistoria)}/impresion`, {});
  }
}
