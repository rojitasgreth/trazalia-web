import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import type { CentroMedico, NuevoCentroPayload } from './centros.model';

const RUTA = '/api/v1/centros';

@Service()
export class CentrosApi {
  private readonly http = inject(HttpClient);

  buscar(texto: string): Observable<CentroMedico[]> {
    return this.http
      .get<{ datos: CentroMedico[] }>(RUTA, { params: new HttpParams().set('texto', texto) })
      .pipe(map((r) => r.datos));
  }

  crear(datos: NuevoCentroPayload): Observable<CentroMedico> {
    return this.http.post<{ centro: CentroMedico }>(RUTA, datos).pipe(map((r) => r.centro));
  }
}

/** Misma normalización que el backend: sin mayúsculas, tildes ni espacios repetidos. */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "Clínica Santa Sofía · Sucre, Miranda" */
export function describirCentro(centro: CentroMedico): string {
  return `${centro.nombre} · ${centro.municipio}, ${centro.estado}`;
}
