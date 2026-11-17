import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CentrosApi, describirCentro, normalizarTexto } from './centros-api';

const CENTRO = {
  idCentro: 'c1',
  nombre: 'Clínica Santa Sofía',
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  comunidad: null,
};

describe('CentrosApi', () => {
  let api: CentrosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CentrosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('buscar es GET /centros?texto= y devuelve la lista', () => {
    let datos: unknown;
    api.buscar('santa').subscribe((r) => (datos = r));

    const peticion = http.expectOne((r) => r.url === '/api/v1/centros');
    expect(peticion.request.params.get('texto')).toBe('santa');
    peticion.flush({ datos: [CENTRO] });
    expect(datos).toEqual([CENTRO]);
  });

  it('crear es POST /centros y devuelve el centro', () => {
    let creado: unknown;
    const cuerpo = {
      nombre: 'X',
      dirEstado: 'Lara',
      dirMunicipio: 'Iribarren',
      dirParroquia: 'Catedral',
    };
    api.crear(cuerpo).subscribe((c) => (creado = c));

    const peticion = http.expectOne('/api/v1/centros');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual(cuerpo);
    peticion.flush({ centro: CENTRO });
    expect(creado).toEqual(CENTRO);
  });

  it('normaliza como el backend y describe el centro', () => {
    expect(normalizarTexto('  Clínica  SANTA Sofía ')).toBe('clinica santa sofia');
    expect(describirCentro(CENTRO)).toBe('Clínica Santa Sofía · Sucre, Miranda');
  });
});
