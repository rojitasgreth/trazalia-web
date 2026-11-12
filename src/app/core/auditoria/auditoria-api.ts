import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { FiltrosAuditoria, PaginaEventosAuditoria } from './auditoria.model';

const RUTA = '/api/v1/auditoria';

@Service()
export class AuditoriaApi {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosAuditoria): Observable<PaginaEventosAuditoria> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<PaginaEventosAuditoria>(`${RUTA}/eventos`, { params });
  }
}
