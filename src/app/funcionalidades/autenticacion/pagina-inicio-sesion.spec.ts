import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PaginaInicioSesion } from './pagina-inicio-sesion';

describe('PaginaInicioSesion', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaInicioSesion],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function elementos(fixture: { nativeElement: HTMLElement }) {
    const raiz = fixture.nativeElement;
    return {
      identificador: raiz.querySelector<HTMLInputElement>('#identificador')!,
      contrasena: raiz.querySelector<HTMLInputElement>('#contrasena')!,
      boton: raiz.querySelector<HTMLButtonElement>('button[type="submit"]')!,
    };
  }

  it('el botón de entrar está deshabilitado hasta completar ambos campos', async () => {
    const fixture = TestBed.createComponent(PaginaInicioSesion);
    await fixture.whenStable();
    const { boton } = elementos(fixture);

    expect(boton.disabled).toBe(true);
  });

  it('inicia sesión correctamente: guarda el usuario y navega a la raíz', async () => {
    const fixture = TestBed.createComponent(PaginaInicioSesion);
    await fixture.whenStable();
    const { identificador, contrasena, boton } = elementos(fixture);
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    identificador.value = 'ana@b.com';
    identificador.dispatchEvent(new Event('input'));
    contrasena.value = 'contraseña-válida';
    contrasena.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(boton.disabled).toBe(false);
    boton.click();

    http.expectOne('/api/v1/autenticacion/iniciar-sesion').flush({
      usuario: {
        idUsuario: 'u1',
        correo: 'ana@b.com',
        nombreUsuario: 'V1',
        nombre: 'Ana',
        apellido: 'Pérez',
        rol: 'FISIOTERAPEUTA',
      },
    });
    await fixture.whenStable();

    const store = TestBed.inject(AuthStore);
    expect(store.estaAutenticado()).toBe(true);
    expect(navegar).toHaveBeenCalledWith(['/']);
  });

  it('muestra el mensaje de error del servidor ante credenciales inválidas', async () => {
    const fixture = TestBed.createComponent(PaginaInicioSesion);
    await fixture.whenStable();
    const { identificador, contrasena, boton } = elementos(fixture);

    identificador.value = 'ana@b.com';
    identificador.dispatchEvent(new Event('input'));
    contrasena.value = 'incorrecta';
    contrasena.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    boton.click();

    http
      .expectOne('/api/v1/autenticacion/iniciar-sesion')
      .flush({ message: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent,
    ).toContain('Credenciales inválidas');
  });
});
