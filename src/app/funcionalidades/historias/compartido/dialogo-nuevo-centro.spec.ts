import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CentroMedico } from '../../../core/centros/centros.model';
import { DialogoNuevoCentro } from './dialogo-nuevo-centro';

const CENTRO: CentroMedico = {
  idCentro: 'c1',
  nombre: 'Clínica Santa Sofía',
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  comunidad: null,
};

@Component({
  imports: [DialogoNuevoCentro],
  template: `<app-dialogo-nuevo-centro
    nombreInicial="Clínica Santa Sofía"
    (creado)="creados.push($event)"
    (cancelar)="cancelado = true"
  />`,
})
class Anfitrion {
  readonly creados: CentroMedico[] = [];
  cancelado = false;
}

describe('DialogoNuevoCentro (B31)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
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

  afterEach(() => http.verify());

  async function montar() {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const escribir = (id: string, valor: string) => {
      const control = elemento.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
      control.value = valor;
      control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
    };
    const enviar = async () => {
      elemento.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
    };
    return { fixture, elemento, escribir, enviar };
  }

  it('precarga el nombre y no envía sin los datos obligatorios', async () => {
    const { elemento, enviar } = await montar();

    expect((elemento.querySelector('#centro-nombre') as HTMLInputElement).value).toBe(
      'Clínica Santa Sofía',
    );
    await enviar();

    expect(elemento.textContent).toContain(
      'Completa el nombre, el estado, el municipio y la parroquia.',
    );
    http.expectNone('/api/v1/centros');
  });

  it('registra el centro y lo entrega', async () => {
    const { fixture, escribir, enviar } = await montar();
    escribir('centro-estado', 'Miranda');
    escribir('centro-municipio', 'Sucre');
    escribir('centro-parroquia', 'Petare');

    await enviar();
    const peticion = http.expectOne('/api/v1/centros');
    expect(peticion.request.body).toEqual({
      nombre: 'Clínica Santa Sofía',
      dirEstado: 'Miranda',
      dirMunicipio: 'Sucre',
      dirParroquia: 'Petare',
      dirComunidad: null,
    });
    peticion.flush({ centro: CENTRO });
    await fixture.whenStable();

    expect(fixture.componentInstance.creados).toEqual([CENTRO]);
  });

  it('RF-031: si ya existe lo muestra y ofrece usarlo en lugar de duplicarlo', async () => {
    const { fixture, elemento, escribir, enviar } = await montar();
    escribir('centro-estado', 'Miranda');
    escribir('centro-municipio', 'sucre');
    escribir('centro-parroquia', 'Petare');

    await enviar();
    http
      .expectOne('/api/v1/centros')
      .flush({ mensaje: 'Ya existe', centro: CENTRO }, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();

    expect(elemento.textContent).toContain('Este centro ya está registrado.');
    Array.from(elemento.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Usar este centro'))!
      .click();
    expect(fixture.componentInstance.creados).toEqual([CENTRO]);
  });

  it('informa otros errores y permite cancelar', async () => {
    const { fixture, elemento, escribir, enviar } = await montar();
    escribir('centro-estado', 'Lara');
    escribir('centro-municipio', 'Iribarren');
    escribir('centro-parroquia', 'Catedral');
    await enviar();
    http.expectOne('/api/v1/centros').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(elemento.textContent).toContain('No se pudo registrar el centro.');
    Array.from(elemento.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    expect(fixture.componentInstance.cancelado).toBe(true);
  });
});
