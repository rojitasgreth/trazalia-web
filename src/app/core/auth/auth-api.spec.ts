import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthApi } from './auth-api';

describe('AuthApi', () => {
  let api: AuthApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AuthApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('iniciarSesion llama al endpoint correcto', () => {
    api.iniciarSesion({ identificador: 'a', contrasena: 'b' }).subscribe();
    const peticion = http.expectOne('/api/v1/autenticacion/iniciar-sesion');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ usuario: {} });
  });

  it('quienSoy llama a GET /autenticacion/yo', () => {
    api.quienSoy().subscribe();
    const peticion = http.expectOne('/api/v1/autenticacion/yo');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ usuario: {} });
  });

  it('cerrarSesion, cerrarSesiones, renovar y registrarActividad son POST', () => {
    api.cerrarSesion().subscribe();
    api.cerrarSesiones().subscribe();
    api.renovar().subscribe();
    api.registrarActividad().subscribe();

    for (const ruta of ['cerrar-sesion', 'cerrar-sesiones', 'renovar', 'actividad']) {
      const peticion = http.expectOne(`/api/v1/autenticacion/${ruta}`);
      expect(peticion.request.method).toBe('POST');
      peticion.flush({ estado: 'ok' });
    }
  });

  it('sesiones es GET y cerrarSesionPropia es POST con el id en la ruta', () => {
    api.sesiones().subscribe();
    http.expectOne('/api/v1/autenticacion/sesiones').flush({ data: [] });

    api.cerrarSesionPropia('s1').subscribe();
    http.expectOne('/api/v1/autenticacion/sesiones/s1/cerrar').flush({ estado: 'ok' });
  });

  it('aceptarInvitacion llama al endpoint de invitaciones', () => {
    api.aceptarInvitacion({ token: 't', contrasena: 'c' }).subscribe();
    const peticion = http.expectOne('/api/v1/autenticacion/invitaciones/aceptar');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ estado: 'activada' });
  });

  it('solicitarRecuperacion envía el correo al endpoint de recuperación', () => {
    api.solicitarRecuperacion('ana@b.com').subscribe();
    const peticion = http.expectOne('/api/v1/autenticacion/contrasena/recuperar');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ correo: 'ana@b.com' });
    peticion.flush({ estado: 'ok' });
  });

  it('restablecerContrasena llama al endpoint de restablecimiento', () => {
    api.restablecerContrasena({ token: 't', contrasena: 'c' }).subscribe();
    const peticion = http.expectOne('/api/v1/autenticacion/contrasena/restablecer');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ estado: 'ok' });
  });
});
