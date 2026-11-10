import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthStore } from './auth.store';
import { InactividadServicio } from './inactividad.servicio';

function configurar(registrarActividad = vi.fn().mockReturnValue(of({ estado: 'ok' as const }))) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      {
        provide: AuthApi,
        useValue: {
          registrarActividad,
          cerrarSesion: vi.fn().mockReturnValue(of({ estado: 'ok' as const })),
        },
      },
    ],
  });
  return { registrarActividad };
}

describe('InactividadServicio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra la advertencia a los 55 minutos de inactividad (BR-022/023)', () => {
    configurar();
    const servicio = TestBed.inject(InactividadServicio);

    servicio.iniciar();
    expect(servicio.mostrarAdvertencia()).toBe(false);

    vi.advanceTimersByTime(55 * 60 * 1000);

    expect(servicio.mostrarAdvertencia()).toBe(true);
    expect(servicio.segundosRestantes()).toBeLessThanOrEqual(300);
    expect(servicio.segundosRestantes()).toBeGreaterThan(290);
  });

  it('continuar reinicia el ciclo y oculta la advertencia (BR-024)', () => {
    const { registrarActividad } = configurar();
    const servicio = TestBed.inject(InactividadServicio);
    servicio.iniciar();
    vi.advanceTimersByTime(55 * 60 * 1000);
    expect(servicio.mostrarAdvertencia()).toBe(true);

    servicio.continuar();

    expect(servicio.mostrarAdvertencia()).toBe(false);
    expect(registrarActividad).toHaveBeenCalled();
  });

  it('cierra la sesión si no se responde dentro de los 5 minutos (BR-025/AC-021)', async () => {
    configurar();
    const authStore = TestBed.inject(AuthStore);
    authStore.establecer({
      idUsuario: 'u1',
      correo: 'a@b.com',
      nombreUsuario: 'V1',
      nombre: 'Ana',
      apellido: 'Pérez',
      rol: 'FISIOTERAPEUTA',
    });
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const servicio = TestBed.inject(InactividadServicio);

    servicio.iniciar();
    vi.advanceTimersByTime(55 * 60 * 1000);
    vi.advanceTimersByTime(5 * 60 * 1000);
    await Promise.resolve();

    expect(authStore.estaAutenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/iniciar-sesion']);
  });

  it('la señal de actividad explícita se limita a una vez cada 2 minutos (BR-036)', () => {
    const { registrarActividad } = configurar();
    const servicio = TestBed.inject(InactividadServicio);
    servicio.iniciar();
    registrarActividad.mockClear();

    servicio.registrarActividadUsuario();
    servicio.registrarActividadUsuario();
    servicio.registrarActividadUsuario();

    expect(registrarActividad).toHaveBeenCalledTimes(1);
  });

  it('detener cancela los temporizadores pendientes', () => {
    configurar();
    const servicio = TestBed.inject(InactividadServicio);
    servicio.iniciar();

    servicio.detener();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(servicio.mostrarAdvertencia()).toBe(false);
  });
});
