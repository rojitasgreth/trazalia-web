import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PaginaInicio } from './pagina-inicio';

describe('PaginaInicio', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaInicio],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function estadoMostrado(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.querySelector('[role="status"]')?.textContent?.trim() ?? '';
  }

  it('muestra que el servidor está disponible cuando la API responde', async () => {
    const fixture = TestBed.createComponent(PaginaInicio);
    await fixture.whenStable();
    expect(estadoMostrado(fixture)).toContain('Comprobando');

    http.expectOne('/api/v1/salud').flush({ estado: 'ok', baseDeDatos: 'ok' });
    await fixture.whenStable();

    expect(estadoMostrado(fixture)).toBe('Servidor disponible.');
  });

  it('muestra un aviso cuando la API no responde', async () => {
    const fixture = TestBed.createComponent(PaginaInicio);
    await fixture.whenStable();

    http.expectOne('/api/v1/salud').flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(estadoMostrado(fixture)).toBe('No se pudo conectar con el servidor.');
  });
});
