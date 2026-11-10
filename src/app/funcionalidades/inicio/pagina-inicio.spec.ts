import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PaginaInicio } from './pagina-inicio';

const USUARIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA' as const,
};

describe('PaginaInicio', () => {
  let http: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaInicio],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
    authStore.establecer(USUARIO);
  });

  afterEach(() => http.verify());

  function estadoMostrado(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.querySelector('[role="status"]')?.textContent?.trim() ?? '';
  }

  it('saluda al usuario autenticado y muestra el estado del servidor', async () => {
    const fixture = TestBed.createComponent(PaginaInicio);
    await fixture.whenStable();
    expect(estadoMostrado(fixture)).toContain('Comprobando');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana');

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

  it('cerrar sesión llama al backend y limpia el estado', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PaginaInicio);
    await fixture.whenStable();
    http.expectOne('/api/v1/salud').flush({ estado: 'ok', baseDeDatos: 'ok' });
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.boton-enlace')
      ?.click();

    // El clic también burbujea al host y dispara la señal de actividad (BR-036).
    http.expectOne('/api/v1/autenticacion/actividad').flush({ estado: 'ok' });
    http.expectOne('/api/v1/autenticacion/cerrar-sesion').flush({ estado: 'ok' });
    await fixture.whenStable();

    expect(authStore.estaAutenticado()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/iniciar-sesion']);
  });
});
