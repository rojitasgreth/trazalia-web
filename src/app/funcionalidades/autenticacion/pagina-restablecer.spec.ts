import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PaginaRestablecer } from './pagina-restablecer';

function crearFixture(token: string | null) {
  TestBed.configureTestingModule({
    imports: [PaginaRestablecer],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } },
      },
    ],
  });
  return TestBed.createComponent(PaginaRestablecer);
}

describe('PaginaRestablecer', () => {
  let http: HttpTestingController;

  afterEach(() => http?.verify());

  it('muestra la pantalla de enlace inválido si no hay token en la URL', async () => {
    const fixture = crearFixture(null);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este enlace ya no funciona',
    );
  });

  it('AC-013: restablece la contraseña con datos válidos y coincidentes', async () => {
    const fixture = crearFixture('token-abc');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    fixture.componentInstance['formulario'].setValue({
      contrasena: 'una-contraseña-nueva',
      confirmarContrasena: 'una-contraseña-nueva',
    });
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne('/api/v1/autenticacion/contrasena/restablecer');
    expect(peticion.request.body).toEqual({
      token: 'token-abc',
      contrasena: 'una-contraseña-nueva',
    });
    peticion.flush({ estado: 'ok' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Contraseña actualizada');
  });

  it('muestra la pantalla compartida de enlace inválido si el token venció o ya se usó', async () => {
    const fixture = crearFixture('token-abc');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    fixture.componentInstance['formulario'].setValue({
      contrasena: 'una-contraseña-nueva',
      confirmarContrasena: 'una-contraseña-nueva',
    });
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    http
      .expectOne('/api/v1/autenticacion/contrasena/restablecer')
      .flush({ message: 'El enlace venció.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este enlace ya no funciona',
    );
  });

  it('deshabilita el envío si las contraseñas no coinciden', async () => {
    const fixture = crearFixture('token-abc');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    fixture.componentInstance['formulario'].setValue({
      contrasena: 'una-contraseña-nueva',
      confirmarContrasena: 'otra-distinta',
    });
    fixture.componentInstance['formulario'].controls.confirmarContrasena.markAsTouched();
    await fixture.whenStable();

    expect(fixture.componentInstance['formulario'].invalid).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('no coinciden');
  });
});
