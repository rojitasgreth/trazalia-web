import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaginaListadoUsuarios } from './pagina-listado-usuarios';

const USUARIO = {
  idUsuario: 'u1',
  nacionalidad: 'V' as const,
  cedula: '1',
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@b.com',
  telefono: null,
  nombreUsuario: 'V1',
  rol: 'FISIOTERAPEUTA' as const,
  estado: 'ACTIVO' as const,
  fechaCreacion: '2026-01-01T00:00:00Z',
  fechaActivacion: '2026-01-01T00:00:00Z',
  ultimoAcceso: null,
};

describe('PaginaListadoUsuarios', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaListadoUsuarios],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carga y muestra la lista al iniciar', async () => {
    const fixture = TestBed.createComponent(PaginaListadoUsuarios);
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/v1/usuarios')
      .flush({ datos: [USUARIO], total: 1, pagina: 1, porPagina: 20 });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana Pérez');
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    const fixture = TestBed.createComponent(PaginaListadoUsuarios);
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/v1/usuarios')
      .flush({ datos: [], total: 0, pagina: 1, porPagina: 20 });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se encontraron usuarios.',
    );
  });

  it('muestra un error si la carga falla', async () => {
    const fixture = TestBed.createComponent(PaginaListadoUsuarios);
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/v1/usuarios')
      .flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar la lista de usuarios.',
    );
  });
});
