import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthStore } from './auth.store';

const ADMIN = {
  idUsuario: 'u1',
  correo: 'a@b.com',
  nombreUsuario: 'V1',
  nombre: 'A',
  apellido: 'B',
  rol: 'ADMINISTRADOR' as const,
};

const FISIO = { ...ADMIN, rol: 'FISIOTERAPEUTA' as const };

describe('adminGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('permite el acceso a un administrador', () => {
    TestBed.inject(AuthStore).establecer(ADMIN);

    const resultado = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(resultado).toBe(true);
  });

  it('redirige a "/" a quien no es administrador', () => {
    TestBed.inject(AuthStore).establecer(FISIO);

    const resultado = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect((resultado as UrlTree).toString()).toBe('/');
  });
});
