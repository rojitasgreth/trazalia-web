import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  Contenido,
  Ficha,
  RespuestaValoracion,
} from '../../core/valoraciones/valoraciones.model';
import fichaNeuro from './pruebas/ficha-neuro.json';
import { SeccionesClinicas } from './secciones-clinicas';

const RUTA = '/api/v1/historias/h1/valoracion';

function respuesta(
  contenido: Contenido | null,
  estado: 'EN_CURSO' | 'FINALIZADA' = 'EN_CURSO',
): RespuestaValoracion {
  return {
    historia: {
      idHistoria: 'h1',
      tipo: 'NEURO_ADULTO',
      estado: 'BORRADOR',
      archivada: false,
      nombre: 'Carlos',
      apellido: 'Andrade',
      puedeIniciarValoracion: true,
      camposFaltantes: [],
    },
    valoracion: contenido && {
      idValoracion: 'v1',
      estado,
      versionFicha: 1,
      version: 2,
      contenido,
      nombreFisioterapeuta: 'Daniela Ortega',
      fechaInicio: '2026-11-19T13:00:00.000Z',
      fechaFinalizacion: null,
    },
    ficha: fichaNeuro as unknown as Ficha,
    datos: { nombre: 'Carlos Andrade' } as RespuestaValoracion['datos'],
  };
}

describe('SeccionesClinicas', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<SeccionesClinicas>;

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

  afterEach(() => http.verify());

  async function estable() {
    await fixture.whenStable();
    fixture.detectChanges();
  }

  async function abrir(r: RespuestaValoracion | null): Promise<HTMLElement> {
    fixture = TestBed.createComponent(SeccionesClinicas);
    fixture.componentRef.setInput('idHistoria', 'h1');
    fixture.detectChanges();
    await Promise.resolve();
    const peticion = http.expectOne(RUTA);
    if (r) peticion.flush(r);
    else peticion.flush(null, { status: 500, statusText: 'Error' });
    await estable();
    return fixture.nativeElement as HTMLElement;
  }

  const CON_DATOS: Contenido = {
    's3.cribado_de_seguridad.f1.c2': 'Sí',
    's3.cribado_de_seguridad.f2.c2': 'No',
    's13.barthel': '85',
  };

  function boton(elemento: HTMLElement, texto: string) {
    return Array.from(elemento.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  }

  it('muestra todas las secciones con lo que tiene cada una', async () => {
    const elemento = await abrir(respuesta(CON_DATOS));

    expect(elemento.querySelectorAll('.tarjeta')).toHaveLength(19);
    expect(elemento.textContent).toContain('2 de 19 con información');
    expect(elemento.querySelectorAll('.tarjeta')[2]!.textContent).toContain('2 datos');
  });

  it('sin valoración lista las secciones sin enlaces', async () => {
    const elemento = await abrir(respuesta(null));

    expect(elemento.querySelectorAll('.tarjeta')).toHaveLength(19);
    expect(elemento.querySelector('a.tarjeta')).toBeNull();
    expect(elemento.textContent).toContain('Las secciones se llenan al iniciar la valoración.');
  });

  it('filtra las secciones', async () => {
    const elemento = await abrir(respuesta(CON_DATOS));

    boton(elemento, 'Con información').click();
    await estable();
    expect(elemento.querySelectorAll('.tarjeta')).toHaveLength(2);

    boton(elemento, 'Sin llenar').click();
    await estable();
    expect(elemento.querySelectorAll('.tarjeta')).toHaveLength(17);
  });

  it('cada tarjeta lleva a su sección, en curso y finalizada', async () => {
    const elemento = await abrir(respuesta(CON_DATOS));
    expect(elemento.querySelectorAll('a.tarjeta')[2]!.getAttribute('href')).toBe(
      '/historias/h1/valoracion?seccion=3',
    );

    const finalizada = await abrir(respuesta(CON_DATOS, 'FINALIZADA'));
    expect(finalizada.querySelectorAll('a.tarjeta')[12]!.getAttribute('href')).toBe(
      '/historias/h1/valoracion?seccion=13',
    );
  });

  it('si falla la carga permite reintentar', async () => {
    const elemento = await abrir(null);
    expect(elemento.textContent).toContain('No se pudieron cargar las secciones.');

    boton(elemento, 'Reintentar').click();
    fixture.detectChanges();
    await Promise.resolve();
    http.expectOne(RUTA).flush(respuesta(CON_DATOS));
    await estable();
    expect(elemento.querySelectorAll('.tarjeta')).toHaveLength(19);
  });
});
