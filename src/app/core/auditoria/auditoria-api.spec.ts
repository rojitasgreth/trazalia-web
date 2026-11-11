import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuditoriaApi } from './auditoria-api';

describe('AuditoriaApi', () => {
  let api: AuditoriaApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuditoriaApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar envía los filtros como query params y omite los vacíos', () => {
    api.listar({ tipoEvento: 'inicio_sesion', pagina: 2, porPagina: 10 }).subscribe();

    const peticion = http.expectOne(
      (r) => r.url === '/api/v1/auditoria/eventos' && r.method === 'GET',
    );
    expect(peticion.request.params.get('tipoEvento')).toBe('inicio_sesion');
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.has('resultado')).toBe(false);
    peticion.flush({ datos: [], total: 0, pagina: 2, porPagina: 10 });
  });
});
