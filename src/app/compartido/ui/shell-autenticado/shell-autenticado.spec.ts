import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../../core/auth/auth.store';
import { ShellAutenticado } from './shell-autenticado';

const FISIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA' as const,
};

const ADMIN = { ...FISIO, rol: 'ADMINISTRADOR' as const };

describe('ShellAutenticado', () => {
  let http: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ShellAutenticado],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    authStore = TestBed.inject(AuthStore);
  });

  afterEach(() => http.verify());

  it('muestra el nombre del usuario, "Mi cuenta" y oculta Usuarios/Auditoría a un fisioterapeuta', async () => {
    authStore.establecer(FISIO);
    const fixture = TestBed.createComponent(ShellAutenticado);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana');
    expect(fixture.nativeElement.querySelector('a[href="/usuarios"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/auditoria"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/mi-cuenta"]')).not.toBeNull();
  });

  it('muestra los enlaces de administración (Usuarios y Auditoría) a un administrador', async () => {
    authStore.establecer(ADMIN);
    const fixture = TestBed.createComponent(ShellAutenticado);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a[href="/usuarios"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/auditoria"]')).not.toBeNull();
  });

  it('cerrar sesión llama al backend, limpia el estado y navega a iniciar-sesion', async () => {
    authStore.establecer(FISIO);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ShellAutenticado);
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
