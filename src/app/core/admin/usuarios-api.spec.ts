import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UsuariosApi } from './usuarios-api';

describe('UsuariosApi', () => {
  let api: UsuariosApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(UsuariosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar envía los filtros como query params y omite los vacíos', () => {
    api.listar({ texto: 'ana', rol: 'ADMINISTRADOR', pagina: 2, porPagina: 10 }).subscribe();

    const peticion = http.expectOne((r) => r.url === '/api/v1/usuarios' && r.method === 'GET');
    expect(peticion.request.params.get('texto')).toBe('ana');
    expect(peticion.request.params.get('rol')).toBe('ADMINISTRADOR');
    expect(peticion.request.params.get('pagina')).toBe('2');
    expect(peticion.request.params.has('estado')).toBe(false);
    peticion.flush({ datos: [], total: 0, pagina: 2, porPagina: 10 });
  });

  it('obtener es GET /usuarios/:id', () => {
    api.obtener('u1').subscribe();
    const peticion = http.expectOne('/api/v1/usuarios/u1');
    expect(peticion.request.method).toBe('GET');
    peticion.flush({ usuario: {} });
  });

  it('crear es POST /usuarios', () => {
    api
      .crear({
        nacionalidad: 'V',
        cedula: '1',
        nombre: 'A',
        apellido: 'B',
        correo: 'a@b.com',
        rol: 'FISIOTERAPEUTA',
      })
      .subscribe();
    const peticion = http.expectOne('/api/v1/usuarios');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ usuario: { idUsuario: 'u1' } });
  });

  it('actualizar es PATCH /usuarios/:id', () => {
    api.actualizar('u1', { nombre: 'Nuevo' }).subscribe();
    const peticion = http.expectOne('/api/v1/usuarios/u1');
    expect(peticion.request.method).toBe('PATCH');
    peticion.flush({ usuario: {} });
  });

  it('suspender/reactivar/inactivar/reenviarInvitacion/desbloquear son POST a su ruta de acción', () => {
    api.suspender('u1').subscribe();
    api.reactivar('u1').subscribe();
    api.inactivar('u1').subscribe();
    api.reenviarInvitacion('u1').subscribe();
    api.desbloquear('u1').subscribe();

    for (const accion of [
      'suspender',
      'reactivar',
      'inactivar',
      'reenviar-invitacion',
      'desbloquear',
    ]) {
      const peticion = http.expectOne(`/api/v1/usuarios/u1/${accion}`);
      expect(peticion.request.method).toBe('POST');
      peticion.flush({ estado: 'ok' });
    }
  });

  it('sesiones es GET y cerrarSesion es POST con ambos ids en la ruta', () => {
    api.sesiones('u1').subscribe();
    http.expectOne('/api/v1/usuarios/u1/sesiones').flush({ data: [] });

    api.cerrarSesion('u1', 's1').subscribe();
    http.expectOne('/api/v1/usuarios/u1/sesiones/s1/cerrar').flush({ estado: 'ok' });
  });
});
