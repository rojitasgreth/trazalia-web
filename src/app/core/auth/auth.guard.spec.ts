import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type MaybeAsync, type GuardResult } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { AuthApi } from './auth-api';
import { authGuard, invitadoGuard } from './auth.guard';
import { AuthStore } from './auth.store';

async function resolver(resultado: MaybeAsync<GuardResult>): Promise<unknown> {
  return isObservable(resultado) ? firstValueFrom(resultado) : resultado;
}

const USUARIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA' as const,
};

function configurar(quienSoy: ReturnType<typeof vi.fn>) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: AuthApi, useValue: { quienSoy } },
    ],
  });
}

describe('authGuard', () => {
  it('permite el acceso si ya hay usuario en memoria', async () => {
    configurar(vi.fn());
    const store = TestBed.inject(AuthStore);
    store.establecer(USUARIO);

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)),
    );

    expect(resultado).toBe(true);
  });

  it('pregunta al servidor en la primera navegación y permite el acceso si hay sesión', async () => {
    configurar(vi.fn().mockReturnValue(of({ usuario: USUARIO })));
    const store = TestBed.inject(AuthStore);

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)),
    );

    expect(resultado).toBe(true);
    expect(store.estaAutenticado()).toBe(true);
  });

  it('redirige a iniciar-sesion si el servidor rechaza la sesión', async () => {
    configurar(vi.fn().mockReturnValue(throwError(() => new Error('401'))));

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)),
    );

    const router = TestBed.inject(Router);
    expect(String(resultado)).toBe(router.parseUrl('/iniciar-sesion').toString());
  });

  it('redirige directo si ya se sabe que no hay sesión (sin volver a preguntar)', async () => {
    const quienSoy = vi.fn().mockReturnValue(throwError(() => new Error('401')));
    configurar(quienSoy);
    const store = TestBed.inject(AuthStore);
    store.limpiar();

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => authGuard({} as never, {} as never)),
    );

    expect(quienSoy).not.toHaveBeenCalled();
    expect(resultado).not.toBe(true);
  });
});

describe('invitadoGuard', () => {
  it('redirige a la raíz si ya hay sesión', async () => {
    configurar(vi.fn());
    const store = TestBed.inject(AuthStore);
    store.establecer(USUARIO);

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => invitadoGuard({} as never, {} as never)),
    );

    const router = TestBed.inject(Router);
    expect(String(resultado)).toBe(router.parseUrl('/').toString());
  });

  it('permite ver el login si el servidor confirma que no hay sesión', async () => {
    configurar(vi.fn().mockReturnValue(throwError(() => new Error('401'))));

    const resultado = await resolver(
      TestBed.runInInjectionContext(() => invitadoGuard({} as never, {} as never)),
    );

    expect(resultado).toBe(true);
  });
});
