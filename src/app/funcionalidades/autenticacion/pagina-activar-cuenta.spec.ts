import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { PaginaActivarCuenta } from './pagina-activar-cuenta';

function crearFixture(token: string | null) {
  TestBed.configureTestingModule({
    imports: [PaginaActivarCuenta],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
        },
      },
    ],
  });
  return TestBed.createComponent(PaginaActivarCuenta);
}

describe('PaginaActivarCuenta', () => {
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

  it('activa la cuenta con contraseñas válidas y coincidentes', async () => {
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

    const peticion = http.expectOne('/api/v1/autenticacion/invitaciones/aceptar');
    expect(peticion.request.body).toEqual({
      token: 'token-abc',
      contrasena: 'una-contraseña-nueva',
    });
    peticion.flush({ estado: 'activada' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cuenta activada');
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
      .expectOne('/api/v1/autenticacion/invitaciones/aceptar')
      .flush({ message: 'La invitación ya venció.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Este enlace ya no funciona',
    );
  });
});
