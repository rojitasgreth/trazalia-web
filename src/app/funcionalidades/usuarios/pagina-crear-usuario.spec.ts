import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PaginaCrearUsuario } from './pagina-crear-usuario';

describe('PaginaCrearUsuario', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaCrearUsuario],
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

  function rellenar(fixture: {
    nativeElement: HTMLElement;
    componentInstance: PaginaCrearUsuario;
  }) {
    fixture.componentInstance['formulario'].setValue({
      nacionalidad: 'V',
      cedula: '123456789',
      nombre: 'Ana',
      apellido: 'Pérez',
      correo: 'ana@b.com',
      telefono: '',
      rol: 'FISIOTERAPEUTA',
    });
  }

  it('crea el usuario y navega a su detalle', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PaginaCrearUsuario);
    await fixture.whenStable();
    rellenar(fixture);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    http.expectOne('/api/v1/usuarios').flush({ usuario: { idUsuario: 'u1' } });
    await fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/usuarios', 'u1']);
  });

  it('muestra el mensaje de error del backend si la creación falla', async () => {
    const fixture = TestBed.createComponent(PaginaCrearUsuario);
    await fixture.whenStable();
    rellenar(fixture);

    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    http
      .expectOne('/api/v1/usuarios')
      .flush(
        { message: 'Ya existe una cuenta con esa cédula.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ya existe una cuenta con esa cédula.',
    );
  });
});
