import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CentroMedico } from '../../../core/centros/centros.model';
import { BuscadorCentro } from './buscador-centro';

const SANTA_SOFIA: CentroMedico = {
  idCentro: 'c1',
  nombre: 'Clínica Santa Sofía',
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  comunidad: null,
};
const AVILA: CentroMedico = { ...SANTA_SOFIA, idCentro: 'c2', nombre: 'Clínica Ávila' };

@Component({
  imports: [BuscadorCentro],
  template: `<app-buscador-centro
    [centro]="centro()"
    (elegir)="elegidos.push($event)"
    (agregar)="agregados.push($event)"
  />`,
})
class Anfitrion {
  readonly centro = signal<CentroMedico | null>(null);
  readonly elegidos: (CentroMedico | null)[] = [];
  readonly agregados: string[] = [];
}

describe('BuscadorCentro (B29/B30)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function montar() {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const input = () => elemento.querySelector<HTMLInputElement>('input[role="combobox"]')!;
    const escribir = (texto: string) => {
      input().value = texto;
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const opciones = () => Array.from(elemento.querySelectorAll<HTMLElement>('li[role="option"]'));
    return { fixture, elemento, input, escribir, opciones };
  }

  function responder(texto: string, centros: CentroMedico[]) {
    vi.advanceTimersByTime(250);
    const peticion = http.expectOne((r) => r.url === '/api/v1/centros');
    expect(peticion.request.params.get('texto')).toBe(texto);
    peticion.flush({ datos: centros });
  }

  it('no busca con menos de 2 caracteres', () => {
    const { escribir, input } = montar();

    escribir('c');
    vi.advanceTimersByTime(300);

    http.expectNone((r) => r.url === '/api/v1/centros');
    expect(input().getAttribute('aria-expanded')).toBe('false');
  });

  it('muestra resultados y elige uno con el teclado', () => {
    const { fixture, escribir, input, opciones } = montar();

    escribir('clí');
    responder('clí', [SANTA_SOFIA, AVILA]);
    fixture.detectChanges();

    expect(input().getAttribute('aria-expanded')).toBe('true');
    expect(opciones().map((o) => o.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining('Clínica Santa Sofía')]),
    );
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(input().getAttribute('aria-activedescendant')).toBe('centro-opcion-1');
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(fixture.componentInstance.elegidos).toEqual([AVILA]);
  });

  it('B30: sin coincidencia exacta ofrece agregar lo escrito como nuevo centro', () => {
    const { fixture, escribir, opciones } = montar();

    escribir('Centro Médico Lara');
    responder('Centro Médico Lara', []);
    fixture.detectChanges();

    const agregar = opciones().at(-1)!;
    expect(agregar.textContent).toContain('+ Agregar «Centro Médico Lara» como nuevo centro');
    agregar.click();
    expect(fixture.componentInstance.agregados).toEqual(['Centro Médico Lara']);
  });

  it('con coincidencia exacta (sin tildes ni mayúsculas) no ofrece agregar', () => {
    const { fixture, escribir, opciones } = montar();

    escribir('clinica santa sofia');
    responder('clinica santa sofia', [SANTA_SOFIA]);
    fixture.detectChanges();

    expect(opciones()).toHaveLength(1);
    opciones()[0]!.click();
    expect(fixture.componentInstance.elegidos).toEqual([SANTA_SOFIA]);
  });

  it('una respuesta vieja no pisa la búsqueda más reciente', () => {
    const { fixture, escribir, opciones } = montar();

    escribir('cli');
    vi.advanceTimersByTime(250);
    const vieja = http.expectOne((r) => r.params.get('texto') === 'cli');
    escribir('clinica a');
    responder('clinica a', [AVILA]);
    vieja.flush({ datos: [SANTA_SOFIA] });
    fixture.detectChanges();

    expect(opciones()[0]!.textContent).toContain('Clínica Ávila');
  });

  it('con un centro elegido lo muestra y permite cambiarlo', () => {
    const { fixture, elemento } = montar();
    fixture.componentInstance.centro.set(SANTA_SOFIA);
    fixture.detectChanges();

    expect(elemento.textContent).toContain('Clínica Santa Sofía');
    expect(elemento.textContent).toContain('Petare, Sucre, Miranda');
    elemento.querySelector<HTMLButtonElement>('.cambiar')!.click();

    expect(fixture.componentInstance.elegidos).toEqual([null]);
  });
});
