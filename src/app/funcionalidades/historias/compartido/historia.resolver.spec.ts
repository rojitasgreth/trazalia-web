import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  RedirectCommand,
  convertToParamMap,
  provideRouter,
  type ActivatedRouteSnapshot,
} from '@angular/router';
import { firstValueFrom, type Observable } from 'rxjs';
import { historiaResolver } from './historia.resolver';

function resolver(): Promise<unknown> {
  const ruta = { paramMap: convertToParamMap({ id: 'h1' }) } as ActivatedRouteSnapshot;
  return firstValueFrom(
    TestBed.runInInjectionContext(() => historiaResolver(ruta, {} as never)) as Observable<unknown>,
  );
}

describe('historiaResolver', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('entrega la historia a editar', async () => {
    const resultado = resolver();
    http.expectOne('/api/v1/historias/h1').flush({ historia: { idHistoria: 'h1' } });

    await expect(resultado).resolves.toEqual({ idHistoria: 'h1' });
  });

  it('si no existe redirige al detalle, que informa el error', async () => {
    const resultado = resolver();
    http.expectOne('/api/v1/historias/h1').flush(null, { status: 404, statusText: 'Not Found' });

    const redireccion = (await resultado) as RedirectCommand;
    expect(redireccion).toBeInstanceOf(RedirectCommand);
    expect(redireccion.redirectTo.toString()).toBe('/historias/h1');
  });
});
