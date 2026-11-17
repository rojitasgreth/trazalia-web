import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type UrlTree } from '@angular/router';
import { AuthStore } from './auth.store';
import { fisioterapeutaGuard } from './fisioterapeuta.guard';

const FISIO = {
  idUsuario: 'u1',
  correo: 'a@b.com',
  nombreUsuario: 'V1',
  nombre: 'A',
  apellido: 'B',
  rol: 'FISIOTERAPEUTA' as const,
};

const ADMIN = { ...FISIO, rol: 'ADMINISTRADOR' as const };

describe('fisioterapeutaGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('permite el acceso a un fisioterapeuta', () => {
    TestBed.inject(AuthStore).establecer(FISIO);

    const resultado = TestBed.runInInjectionContext(() =>
      fisioterapeutaGuard({} as never, {} as never),
    );

    expect(resultado).toBe(true);
  });

  it('AC-001: redirige a "/" a un administrador', () => {
    TestBed.inject(AuthStore).establecer(ADMIN);

    const resultado = TestBed.runInInjectionContext(() =>
      fisioterapeutaGuard({} as never, {} as never),
    );

    expect((resultado as UrlTree).toString()).toBe('/');
  });
});
