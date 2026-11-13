import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaginaAuditoria } from './pagina-auditoria';

function crearFixture() {
  TestBed.configureTestingModule({
    imports: [PaginaAuditoria],
    providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
  });
  return {
    fixture: TestBed.createComponent(PaginaAuditoria),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('PaginaAuditoria', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carga la primera página al iniciar y muestra los eventos', async () => {
    const { fixture, http } = crearFixture();
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/v1/auditoria/eventos')
      .flush({
        datos: [
          {
            idEvento: 'e1',
            idUsuarioActor: 'abcdefgh-1111-2222-3333-444444444444',
            idUsuarioAfectado: null,
            nombreActor: 'Ana Pérez',
            nombreAfectado: null,
            tipoEvento: 'inicio_sesion',
            resultado: 'EXITOSO',
            metadatosMinimos: null,
            fechaEvento: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 20,
      });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('inicio_sesion');
    expect(texto).toContain('Exitoso');
    expect(texto).toContain('Ana Pérez');
  });

  it('muestra un mensaje de error si la carga falla', async () => {
    const { fixture, http } = crearFixture();
    await fixture.whenStable();

    http
      .expectOne((r) => r.url === '/api/v1/auditoria/eventos')
      .flush({ mensaje: 'error' }, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo cargar la auditoría.',
    );
  });
});
