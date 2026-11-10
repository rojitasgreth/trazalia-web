import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

function configurar() {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

describe('authInterceptor', () => {
  it('ante un 401 renueva y repite la solicitud original', async () => {
    configurar();
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    const promesa = firstValueFrom(http.get('/api/v1/autenticacion/sesiones'));

    backend
      .expectOne('/api/v1/autenticacion/sesiones')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne('/api/v1/autenticacion/renovar').flush({ estado: 'ok' });
    backend.expectOne('/api/v1/autenticacion/sesiones').flush({ data: [] });

    await expect(promesa).resolves.toEqual({ data: [] });
  });

  it('si la renovación también falla, limpia el estado y navega a iniciar-sesion', async () => {
    configurar();
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(AuthStore);
    store.establecer({
      idUsuario: 'u1',
      correo: 'a@b.com',
      nombreUsuario: 'V1',
      nombre: 'Ana',
      apellido: 'Pérez',
      rol: 'FISIOTERAPEUTA',
    });
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const promesa = firstValueFrom(http.get('/api/v1/autenticacion/sesiones'));

    backend
      .expectOne('/api/v1/autenticacion/sesiones')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    backend
      .expectOne('/api/v1/autenticacion/renovar')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(promesa).rejects.toBeTruthy();
    expect(store.estaAutenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/iniciar-sesion']);
  });

  it('no intenta renovar ante un 401 en la propia ruta de login', async () => {
    configurar();
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    const promesa = firstValueFrom(
      http.post('/api/v1/autenticacion/iniciar-sesion', { identificador: 'a', contrasena: 'b' }),
    );

    backend
      .expectOne('/api/v1/autenticacion/iniciar-sesion')
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    await expect(promesa).rejects.toBeTruthy();
    backend.verify();
  });
});
