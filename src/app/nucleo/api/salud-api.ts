import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface EstadoSalud {
  estado: 'ok';
  baseDeDatos: 'ok';
}

@Service()
export class SaludApi {
  private readonly http = inject(HttpClient);

  consultar(): Observable<EstadoSalud> {
    return this.http.get<EstadoSalud>('/api/v1/salud');
  }
}
