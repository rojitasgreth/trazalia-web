import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PaginaMiCuenta } from './pagina-mi-cuenta';

const USUARIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA' as const,
};

describe('PaginaMiCuenta', () => {
  let http: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaMiCuenta],
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

  it('muestra el perfil y la lista de sesiones', async () => {
    const fixture = TestBed.createComponent(PaginaMiCuenta);
    await fixture.whenStable();

    http.expectOne('/api/v1/autenticacion/sesiones').flush({
      data: [
        {
          idSesion: 's1',
          etiquetaDispositivo: 'Chrome en Windows',
          fechaCreacion: '2026-01-01T00:00:00Z',
          ultimaActividad: '2026-01-01T00:00:00Z',
        },
      ],
    });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('ana@b.com');
    expect(texto).toContain('Chrome en Windows');
  });

  it('enviar el enlace llama a solicitar-recuperacion con el correo propio', async () => {
    const fixture = TestBed.createComponent(PaginaMiCuenta);
    await fixture.whenStable();
    http.expectOne('/api/v1/autenticacion/sesiones').flush({ data: [] });
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.boton-secundario')[0]
      ?.click();

    const peticion = http.expectOne('/api/v1/autenticacion/contrasena/recuperar');
    expect(peticion.request.body).toEqual({ correo: 'ana@b.com' });
    peticion.flush({ estado: 'ok' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Si la cuenta existe, se envió un enlace a tu correo.',
    );
  });

  it('cerrar sesión en todos los dispositivos limpia el estado y navega a iniciar-sesion', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PaginaMiCuenta);
    await fixture.whenStable();
    http.expectOne('/api/v1/autenticacion/sesiones').flush({ data: [] });
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLButtonElement>('.boton-secundario')[1]
      ?.click();

    http.expectOne('/api/v1/autenticacion/cerrar-sesiones').flush({ estado: 'ok' });
    await fixture.whenStable();

    expect(authStore.estaAutenticado()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/iniciar-sesion']);
  });
});
