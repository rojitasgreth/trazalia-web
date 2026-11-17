import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  provideRouter,
  type ActivatedRouteSnapshot,
  type UrlTree,
} from '@angular/router';
import { tipoDisponible, tipoHistoriaDisponibleGuard } from './tipo-disponible.guard';

function ejecutar(tipo: string) {
  const ruta = { paramMap: convertToParamMap({ tipo }) } as ActivatedRouteSnapshot;
  return TestBed.runInInjectionContext(() => tipoHistoriaDisponibleGuard(ruta, {} as never));
}

describe('tipoHistoriaDisponibleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('deja pasar los tipos de adulto', () => {
    expect(ejecutar('TRAUMA_ADULTO')).toBe(true);
    expect(tipoDisponible('ADULTO_MAYOR')).toBe(true);
  });

  it('devuelve a elegir tipo con un tipo inexistente o aún no disponible', () => {
    expect((ejecutar('OTRO') as UrlTree).toString()).toBe('/historias/nueva');
    expect((ejecutar('REHAB_INFANTIL') as UrlTree).toString()).toBe('/historias/nueva');
  });
});
