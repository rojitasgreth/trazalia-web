import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HistoriasApi } from './historias-api';

describe('HistoriasApi', () => {
  let api: HistoriasApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(HistoriasApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar envía los filtros como query params y omite los vacíos', () => {
    api
      .listar({
        texto: 'carlos',
        tipo: 'NEURO_ADULTO',
        archivadas: false,
        pagina: 2,
        estado: undefined,
      })
      .subscribe();

    const peticion = http.expectOne((r) => r.url === '/api/v1/historias' && r.method === 'GET');
    expect(peticion.request.params.get('texto')).toBe('carlos');
    expect(peticion.request.params.get('tipo')).toBe('NEURO_ADULTO');
    expect(peticion.request.params.get('archivadas')).toBe('false');
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.has('estado')).toBe(false);
    peticion.flush({ datos: [], total: 0, pagina: 2, porPagina: 20, conteos: {} });
  });

  it('obtener es GET /historias/:id', () => {
    api.obtener('h1').subscribe();
    const peticion = http.expectOne('/api/v1/historias/h1');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ historia: {} });
  });

  it('crear es POST /historias con el cuerpo tal cual', () => {
    const cuerpo = { tipo: 'TRAUMA_ADULTO' as const, nombre: 'Carlos', apellido: 'Andrade' };
    api.crear(cuerpo).subscribe();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({ historia: {} });
  });
});
