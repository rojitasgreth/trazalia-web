import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  provideRouter,
  type ActivatedRouteSnapshot,
  type UrlTree,
} from '@angular/router';
import { tipoHistoriaValidoGuard } from './tipo-valido.guard';

function ejecutar(tipo: string) {
  const ruta = { paramMap: convertToParamMap({ tipo }) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(() => tipoHistoriaValidoGuard(ruta, {} as never));
}

describe('tipoHistoriaValidoGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('deja pasar los cuatro tipos', () => {
    expect(ejecutar('TRAUMA_ADULTO')).toBe(true);
    expect(ejecutar('REHAB_INFANTIL')).toBe(true);
  });

  it('devuelve a elegir tipo con un tipo inexistente', () => {
    expect((ejecutar('OTRO') as UrlTree).toString()).toBe('/historias/nueva');
  });
});
