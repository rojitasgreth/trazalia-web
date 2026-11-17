import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ConsultaCoincidencias,
  CrearHistoriaPayload,
  FiltrosHistorias,
  HistoriaDetalle,
  PaginaHistorias,
  ResultadoCoincidencia,
} from './historias.model';

const RUTA = '/api/v1/historias';

@Service()
export class HistoriasApi {
  private readonly http = inject(HttpClient);

  listar(filtros: FiltrosHistorias): Observable<PaginaHistorias> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') {
        params = params.set(clave, String(valor));
      }
    }
    return this.http.get<PaginaHistorias>(RUTA, { params });
  }

  obtener(idHistoria: string): Observable<{ historia: HistoriaDetalle }> {
    return this.http.get<{ historia: HistoriaDetalle }>(`${RUTA}/${idHistoria}`);
  }

  crear(datos: CrearHistoriaPayload): Observable<{ historia: HistoriaDetalle }> {
    return this.http.post<{ historia: HistoriaDetalle }>(RUTA, datos);
  }

  coincidencias(consulta: ConsultaCoincidencias): Observable<ResultadoCoincidencia> {
    return this.http.post<ResultadoCoincidencia>(`${RUTA}/coincidencias`, consulta);
  }
}
