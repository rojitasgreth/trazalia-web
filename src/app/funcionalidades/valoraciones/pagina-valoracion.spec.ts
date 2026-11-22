import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type {
  Ficha,
  RespuestaValoracion,
  Valoracion,
} from '../../core/valoraciones/valoraciones.model';
import { PaginaValoracion } from './pagina-valoracion';
import fichaNeuro from './pruebas/ficha-neuro.json';
import fichaTrauma from './pruebas/ficha-trauma.json';

const RUTA = '/api/v1/historias/h1/valoracion';

function valoracion(cambios: Partial<Valoracion> = {}): Valoracion {
  return {
    idValoracion: 'v1',
    estado: 'EN_CURSO',
    versionFicha: 1,
    version: 1,
    contenido: {},
    nombreFisioterapeuta: 'Daniela Ortega',
    fechaInicio: '2026-11-19T13:00:00.000Z',
    fechaFinalizacion: null,
    ...cambios,
  };
}

function respuesta(
  cambios: Partial<Valoracion> | null = {},
  ficha: unknown = fichaTrauma,
): RespuestaValoracion {
  return {
    historia: {
      idHistoria: 'h1',
      tipo: (ficha as Ficha).tipo,
      estado: 'BORRADOR',
      archivada: false,
      nombre: 'Carlos',
      apellido: 'Andrade',
      puedeIniciarValoracion: true,
      camposFaltantes: [],
    },
    valoracion: cambios === null ? null : valoracion(cambios),
    ficha: ficha as Ficha,
    datos: {
      nombre: 'Carlos Andrade',
      documento: 'V-15.482.301',
      edad: '41 años',
      sexo: 'Masculino',
    } as RespuestaValoracion['datos'],
  };
}

describe('PaginaValoracion', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'historias/:id/valoracion', component: PaginaValoracion },
          { path: '**', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  async function abrir(r: RespuestaValoracion): Promise<HTMLElement> {
    await harness.navigateByUrl('/historias/h1/valoracion');
    http.expectOne(RUTA).flush(r);
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  async function estable() {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  function escribir(elemento: HTMLElement, selector: string, valor: string) {
    const input = elemento.querySelector<HTMLInputElement>(selector)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('AC-C14: muestra una pestaña por sección y solo la sección activa, con los datos personales', async () => {
    const elemento = await abrir(respuesta());

    const pestanas = elemento.querySelectorAll('[role="tab"]');
    expect(pestanas).toHaveLength(11);
    expect(pestanas[0]!.getAttribute('aria-selected')).toBe('true');
    expect(elemento.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
    const texto = elemento.textContent ?? '';
    expect(texto).toContain('1. Identificación');
    expect(texto).toContain('Sección 1 de 11');
    expect(texto).toContain('Carlos Andrade');
    expect(texto).toContain('Daniela Ortega');
    expect(texto).toContain('En curso');
  });

  it('decisión del 19-11-2026: al cambiar de pestaña guarda lo escrito con su versión', async () => {
    const elemento = await abrir(respuesta());
    escribir(elemento, '#campo-s1-medico_tratante', 'Dr. Mendoza');

    (elemento.querySelector('#pestana-1') as HTMLButtonElement).click();
    const peticion = http.expectOne((r) => r.method === 'PUT' && r.url === RUTA);
    expect(peticion.request.body).toEqual({
      contenido: { 's1.medico_tratante': 'Dr. Mendoza' },
      version: 1,
    });
    peticion.flush(respuesta({ version: 2, contenido: { 's1.medico_tratante': 'Dr. Mendoza' } }));
    await estable();

    expect(elemento.textContent).toContain('2. Diagnóstico, mecanismo y antecedentes');
    expect(elemento.textContent).toContain('Borrador de la valoración guardado hoy');

    // Sin cambios no se vuelve a guardar.
    (elemento.querySelector('#pestana-0') as HTMLButtonElement).click();
    http.expectNone((r) => r.method === 'PUT');
  });

  it('las flechas recorren las pestañas (patrón de pestañas verticales)', async () => {
    const elemento = await abrir(respuesta());
    const lista = elemento.querySelector('[role="tablist"]')!;

    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await estable();
    expect(elemento.querySelector('#pestana-1')!.getAttribute('aria-selected')).toBe('true');
    lista.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await estable();
    expect(elemento.textContent).toContain('Consentimiento y firmas');
  });

  it('SPEC C §13: si la valoración cambió en otra pestaña avisa y permite recargar', async () => {
    const elemento = await abrir(respuesta());
    escribir(elemento, '#campo-s1-medico_tratante', 'Dr. Mendoza');

    (elemento.querySelector('#pestana-1') as HTMLButtonElement).click();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush({ mensaje: 'Cambió', motivo: 'version' }, { status: 409, statusText: 'Conflict' });
    await estable();

    expect(elemento.textContent).toContain('La valoración cambió en otra pestaña');
    const recargar = Array.from(elemento.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Recargar'),
    )!;
    recargar.click();
    http.expectOne(RUTA).flush(respuesta({ version: 3 }));
  });

  it('cada fila de opciones es independiente: marcar una no marca las demás', async () => {
    const elemento = await abrir(respuesta({}, fichaNeuro));
    (elemento.querySelector('#pestana-2') as HTMLButtonElement).click();
    await estable();
    const filas = Array.from(elemento.querySelectorAll('[role="radiogroup"]')).map((g) =>
      Array.from(g.querySelectorAll<HTMLInputElement>('input[type="radio"]')),
    );
    expect(filas).toHaveLength(8);

    filas[0]![0]!.click();
    await estable();
    expect(filas.map((f) => f.map((r) => r.checked))).toEqual([
      [true, false],
      ...Array.from({ length: 7 }, () => [false, false]),
    ]);

    filas[1]![1]!.click();
    await estable();
    expect(filas[0]!.map((r) => r.checked)).toEqual([true, false]);
    expect(filas[1]!.map((r) => r.checked)).toEqual([false, true]);
    expect(filas[2]!.map((r) => r.checked)).toEqual([false, false]);

    (elemento.querySelector('#pestana-3') as HTMLButtonElement).click();
    const peticion = http.expectOne((r) => r.method === 'PUT');
    expect(peticion.request.body.contenido).toEqual({
      's3.cribado_de_seguridad.f1.c2': 'Sí',
      's3.cribado_de_seguridad.f2.c2': 'No',
    });
    peticion.flush(
      respuesta({ version: 2, contenido: peticion.request.body.contenido }, fichaNeuro),
    );
  });

  it('un número con unidades no se envía: señala el campo y conserva lo escrito', async () => {
    const elemento = await abrir(respuesta({}, fichaNeuro));
    (elemento.querySelector('#pestana-12') as HTMLButtonElement).click();
    await estable();
    escribir(elemento, '#campo-s13-barthel', '85/100');

    (elemento.querySelector('#pestana-13') as HTMLButtonElement).click();
    await estable();
    http.expectNone((r) => r.method === 'PUT');
    expect(elemento.querySelector('#pestana-12')!.getAttribute('aria-selected')).toBe('true');
    expect(elemento.textContent).toContain('Revisa «Barthel»');
    const barthel = elemento.querySelector<HTMLInputElement>('#campo-s13-barthel')!;
    expect(barthel.value).toBe('85/100');
    expect(barthel.getAttribute('aria-invalid')).toBe('true');

    escribir(elemento, '#campo-s13-barthel', '85');
    await estable();
    expect(barthel.getAttribute('aria-invalid')).toBeNull();
    expect(elemento.textContent).not.toContain('Revisa «Barthel»');
    (elemento.querySelector('#pestana-13') as HTMLButtonElement).click();
    const peticion = http.expectOne((r) => r.method === 'PUT');
    expect(peticion.request.body.contenido).toEqual({ 's13.barthel': '85' });
    peticion.flush(respuesta({ version: 2, contenido: { 's13.barthel': '85' } }, fichaNeuro));
  });

  it('si la API rechaza un campo, lleva a su pestaña y dice cuál es', async () => {
    const elemento = await abrir(respuesta());
    escribir(elemento, '#campo-s1-medico_tratante', 'Dr. Mendoza');

    (elemento.querySelector('#pestana-3') as HTMLButtonElement).click();
    http
      .expectOne((r) => r.method === 'PUT')
      .flush(
        {
          mensaje: 'El contenido no coincide con la ficha.',
          errores: [{ clave: 's1.medico_tratante', mensaje: 'Máximo 500 caracteres.' }],
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await estable();

    expect(elemento.querySelector('#pestana-0')!.getAttribute('aria-selected')).toBe('true');
    expect(elemento.textContent).toContain('Revisa «Médico tratante»');
    expect(elemento.textContent).toContain('Máximo 500 caracteres.');
  });

  it('RF-C08: el IMC se calcula con peso y talla y respeta la corrección manual', async () => {
    const elemento = await abrir(respuesta());
    const pagina = harness.routeDebugElement!.componentInstance as {
      grupo: { controls: Record<string, { value: unknown; setValue(v: unknown): void }> };
    };
    const celda = 's5.signos_vitales_y_antropometria.f6.c2';
    const c = pagina.grupo.controls;

    c[`${celda}.p1`]!.setValue('78');
    c[`${celda}.p2`]!.setValue('176');
    expect(c[`${celda}.imc`]!.value).toBe('25,2');

    c[`${celda}.imc`]!.setValue('25');
    c[`${celda}.p1`]!.setValue('80');
    expect(c[`${celda}.imc`]!.value).toBe('25');
    expect(elemento).toBeTruthy();
  });

  it('RF-C10: el puntaje del banco de escalas solo se habilita al marcar "Aplicada"', async () => {
    const elemento = await abrir(respuesta({}, fichaNeuro));
    (elemento.querySelector('#pestana-13') as HTMLButtonElement).click();
    await estable();

    const entradaPuntaje = elemento.querySelector<HTMLInputElement>(
      '[aria-label="Puntaje: 10 Meter Walk Test (10mWT)"]',
    )!;
    const casilla = elemento.querySelector<HTMLInputElement>(
      '[aria-label="Aplicada: 10 Meter Walk Test (10mWT)"]',
    )!;
    expect(casilla).not.toBeNull();
    expect(entradaPuntaje.disabled).toBe(true);
    casilla.click();
    await estable();
    expect(entradaPuntaje.disabled).toBe(false);
  });

  it('RF-C12/RF-C13: finaliza tras confirmar, guardando antes lo pendiente', async () => {
    const elemento = await abrir(respuesta());
    escribir(elemento, '#campo-s1-medico_tratante', 'Dr. Mendoza');
    const finalizar = () =>
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('button')).filter((b) =>
        b.textContent?.includes('Finalizar valoración'),
      );

    finalizar()[0]!.click();
    await estable();
    expect(elemento.textContent).toContain('¿Finalizar la valoración?');
    expect(elemento.textContent).toContain('Borrador → Activa');
    finalizar().at(-1)!.click();

    http.expectOne((r) => r.method === 'PUT').flush(respuesta({ version: 2 }));
    const fin = http.expectOne(`${RUTA}/finalizar`);
    expect(fin.request.body).toEqual({ version: 2 });
    fin.flush({
      ...respuesta({
        estado: 'FINALIZADA',
        version: 3,
        fechaFinalizacion: '2026-11-19T14:45:00.000Z',
      }),
      historia: { ...respuesta().historia, estado: 'ACTIVA' },
    });
    await estable();

    expect(elemento.textContent).toContain('Finalizada · solo lectura');
    expect(elemento.textContent).toContain('Valoración finalizada el 19/11/2026');
    expect(elemento.querySelector('#campo-s1-medico_tratante')).toBeNull();
  });

  it('"Seguir editando" cierra la confirmación sin cambios', async () => {
    const elemento = await abrir(respuesta());
    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Finalizar valoración'))!
      .click();
    await estable();
    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Seguir editando'))!
      .click();
    await estable();
    expect(elemento.textContent).not.toContain('¿Finalizar la valoración?');
    http.expectNone(`${RUTA}/finalizar`);
  });

  it('"Guardar y salir" guarda y vuelve a la historia', async () => {
    const elemento = await abrir(respuesta());
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    escribir(elemento, '#campo-s1-medico_tratante', 'Dr. Mendoza');

    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Guardar y salir'))!
      .click();
    http.expectOne((r) => r.method === 'PUT').flush(respuesta({ version: 2 }));
    await estable();

    expect(navegar).toHaveBeenCalledWith(['/historias', 'h1']);
  });

  it('SPEC C §11: la finalizada se imprime con todas las secciones y las firmas', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const elemento = await abrir(
      respuesta({
        estado: 'FINALIZADA',
        fechaFinalizacion: '2026-11-19T14:45:00.000Z',
        contenido: { 's2.fase': 'Subaguda' },
      }),
    );
    expect(elemento.textContent).toContain('Valoración finalizada el 19/11/2026');
    vi.useFakeTimers();

    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Imprimir para firmas'))!
      .click();
    http.expectOne(`${RUTA}/impresion`).flush(null);
    harness.fixture.detectChanges();

    expect(elemento.querySelectorAll('.impresion-seccion')).toHaveLength(11);
    expect(elemento.textContent).toContain('Paciente / representante');
    expect(elemento.textContent).toContain('Subaguda');
    vi.runAllTimers();
    expect(imprimir).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('sin valoración permite iniciarla', async () => {
    const elemento = await abrir(respuesta(null));
    expect(elemento.textContent).toContain('La valoración aún no se ha iniciado');

    Array.from(elemento.querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Iniciar valoración'))!
      .click();
    http.expectOne((r) => r.method === 'POST' && r.url === RUTA).flush(respuesta());
    await estable();
    expect(elemento.querySelectorAll('[role="tab"]')).toHaveLength(11);
  });
});
