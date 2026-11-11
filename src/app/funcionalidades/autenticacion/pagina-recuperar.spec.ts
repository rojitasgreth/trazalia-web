import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaginaRecuperar } from './pagina-recuperar';

describe('PaginaRecuperar', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaRecuperar],
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

  it('AC-012: envía el correo y muestra "Revisa tu correo" al terminar', async () => {
    const fixture = TestBed.createComponent(PaginaRecuperar);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#correo',
    )!;
    input.value = 'ana@b.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne('/api/v1/autenticacion/contrasena/recuperar');
    expect(peticion.request.body).toEqual({ correo: 'ana@b.com' });
    peticion.flush({ estado: 'ok' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Revisa tu correo');
  });

  it('permite volver al formulario para solicitar otro enlace', async () => {
    const fixture = TestBed.createComponent(PaginaRecuperar);
    await fixture.whenStable();
    fixture.componentInstance['enviado'].set(true);
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.boton-secundario')
      ?.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('#correo')).not.toBeNull();
  });

  it('muestra un error si la solicitud falla', async () => {
    const fixture = TestBed.createComponent(PaginaRecuperar);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      '#correo',
    )!;
    input.value = 'ana@b.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));
    http
      .expectOne('/api/v1/autenticacion/contrasena/recuperar')
      .flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No se pudo enviar la solicitud.',
    );
  });
});
