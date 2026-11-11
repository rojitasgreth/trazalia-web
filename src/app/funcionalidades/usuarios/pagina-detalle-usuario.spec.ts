import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { PaginaDetalleUsuario } from './pagina-detalle-usuario';

const ADMIN_ACTUAL = {
  idUsuario: 'admin-1',
  correo: 'admin@b.com',
  nombreUsuario: 'V0',
  nombre: 'Admin',
  apellido: 'Uno',
  rol: 'ADMINISTRADOR' as const,
};

function usuarioBase(extra: Record<string, unknown> = {}) {
  return {
    idUsuario: 'u1',
    nacionalidad: 'V',
    cedula: '1',
    nombre: 'Ana',
    apellido: 'Pérez',
    correo: 'ana@b.com',
    telefono: null,
    nombreUsuario: 'V1',
    rol: 'FISIOTERAPEUTA',
    estado: 'ACTIVO',
    fechaCreacion: '2026-01-01T00:00:00Z',
    fechaActivacion: '2026-01-01T00:00:00Z',
    ultimoAcceso: null,
    ...extra,
  };
}

function crearFixture(idRuta: string) {
  TestBed.configureTestingModule({
    imports: [PaginaDetalleUsuario],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: idRuta }) } },
      },
    ],
  });
  TestBed.inject(AuthStore).establecer(ADMIN_ACTUAL);
  return TestBed.createComponent(PaginaDetalleUsuario);
}

describe('PaginaDetalleUsuario', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    http = undefined as unknown as HttpTestingController;
  });

  afterEach(() => http?.verify());

  it('carga el usuario y sus sesiones, y ofrece suspender/inactivar sobre otra cuenta activa', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase() });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('Suspender');
    expect(texto).toContain('Inactivar');
    expect(texto).not.toContain('Reactivar');
  });

  it('BR-033: oculta suspender/inactivar y avisa sobre el rol en la propia cuenta', async () => {
    const fixture = crearFixture('admin-1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http
      .expectOne('/api/v1/usuarios/admin-1')
      .flush({ usuario: usuarioBase({ idUsuario: 'admin-1', rol: 'ADMINISTRADOR' }) });
    http.expectOne('/api/v1/usuarios/admin-1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).not.toContain('Suspender');
    expect(texto).not.toContain('Inactivar');
    expect(texto).toContain('No puedes cambiar tu propio rol.');
  });

  it('AC-032: ofrece reenviar invitación para una SUSPENDIDA que nunca se activó', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();

    http
      .expectOne('/api/v1/usuarios/u1')
      .flush({ usuario: usuarioBase({ estado: 'SUSPENDIDO', fechaActivacion: null }) });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Reenviar invitación');
    expect(texto).not.toContain('Reactivar');
  });

  it('suspender llama a la API y vuelve a cargar el usuario', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase() });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll('button')
      .forEach((boton) => boton.textContent?.trim() === 'Suspender' && boton.click());

    http.expectOne('/api/v1/usuarios/u1/suspender').flush({ estado: 'ok' });
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase({ estado: 'SUSPENDIDO' }) });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Usuario suspendido.');
  });

  it('guardar envía el formulario editado por PATCH', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase() });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    fixture.componentInstance['formulario'].patchValue({ nombre: 'Editado' });
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')
      ?.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne('/api/v1/usuarios/u1');
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body.nombre).toBe('Editado');
    peticion.flush({ usuario: usuarioBase({ nombre: 'Editado' }) });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Cambios guardados.');
  });

  it('ofrece Desbloquear solo para una cuenta BLOQUEADO, y lo ejecuta correctamente', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase({ estado: 'BLOQUEADO' }) });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Desbloquear');
    expect(texto).not.toContain('Suspender');

    (fixture.nativeElement as HTMLElement)
      .querySelectorAll('button')
      .forEach((boton) => boton.textContent?.trim() === 'Desbloquear' && boton.click());

    http.expectOne('/api/v1/usuarios/u1/desbloquear').flush({ estado: 'ok' });
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase({ estado: 'ACTIVO' }) });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Usuario desbloqueado.');
  });

  it('cerrar una sesión llama a la API y recarga las sesiones', async () => {
    const fixture = crearFixture('u1');
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    http.expectOne('/api/v1/usuarios/u1').flush({ usuario: usuarioBase() });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({
      data: [
        { idSesion: 's1', etiquetaDispositivo: 'Chrome', fechaCreacion: '', ultimaActividad: '' },
      ],
    });
    await fixture.whenStable();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.boton-enlace')
      ?.click();

    http.expectOne('/api/v1/usuarios/u1/sesiones/s1/cerrar').flush({ estado: 'ok' });
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No tiene sesiones activas.',
    );
  });
});
