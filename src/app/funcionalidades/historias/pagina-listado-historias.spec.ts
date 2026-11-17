import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { HistoriaResumen, PaginaHistorias } from '../../core/historias/historias.model';
import { PaginaListadoHistorias } from './pagina-listado-historias';

const CARLOS: HistoriaResumen = {
  idHistoria: 'h1',
  tipo: 'TRAUMA_ADULTO',
  estado: 'ACTIVA',
  archivada: false,
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15482301',
  sinDocumento: false,
  telefono: '0412-555-0134',
  fechaNacimiento: '1985-03-14',
  fechaCreacion: '2026-09-08T12:00:00.000Z',
  fechaActualizacion: '2026-11-09T12:00:00.000Z',
  fechaArchivo: null,
};

function pagina(datos: HistoriaResumen[], extra: Partial<PaginaHistorias> = {}): PaginaHistorias {
  return {
    datos,
    total: datos.length,
    pagina: 1,
    porPagina: 20,
    conteos: { historias: datos.length, archivadas: 2 },
    ...extra,
  };
}

describe('PaginaListadoHistorias', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'historias', component: PaginaListadoHistorias }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function abrir(url = '/historias') {
    await harness.navigateByUrl(url, PaginaListadoHistorias);
    harness.fixture.detectChanges();
  }

  function responder(cuerpo: PaginaHistorias) {
    const peticion = http.expectOne((r) => r.url === '/api/v1/historias');
    peticion.flush(cuerpo);
    return peticion.request;
  }

  async function estable() {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  function texto(): string {
    return (harness.routeNativeElement as HTMLElement).textContent ?? '';
  }

  it('RF-022: muestra las columnas acordadas de cada historia', async () => {
    await abrir();
    const peticion = responder(pagina([CARLOS]));
    await estable();

    expect(peticion.params.get('archivadas')).toBe('false');
    expect(texto()).toContain('Carlos Andrade');
    expect(texto()).toContain('V-15.482.301');
    expect(texto()).toContain('Traumatología del adulto');
    expect(texto()).toContain('Activa');
    expect(texto()).toContain('0412-555-0134');
    expect(texto()).toContain('14/03/1985');
    expect(texto()).toContain('Mostrando 1–1 de 1 historias');
    const enlace = harness.routeNativeElement?.querySelector('a.nombre');
    expect(enlace?.getAttribute('href')).toBe('/historias/h1');
  });

  it('B03: sin ninguna historia muestra el estado vacío y oculta los filtros', async () => {
    await abrir();
    responder(pagina([], { conteos: { historias: 0, archivadas: 0 } }));
    await estable();

    expect(texto()).toContain('Aún no tienes historias clínicas');
    expect(harness.routeNativeElement?.querySelector('#buscar')).toBeNull();
  });

  it('B04: filtra por tipo y, sin resultados, ofrece limpiar la búsqueda', async () => {
    await abrir();
    responder(pagina([CARLOS]));
    await estable();

    const tipo = harness.routeNativeElement!.querySelector<HTMLSelectElement>('#filtro-tipo')!;
    tipo.value = 'NEURO_ADULTO';
    tipo.dispatchEvent(new Event('change'));
    harness.fixture.detectChanges();
    const filtrada = responder(pagina([], { conteos: { historias: 1, archivadas: 0 } }));
    await estable();

    expect(filtrada.params.get('tipo')).toBe('NEURO_ADULTO');
    expect(texto()).toContain('Sin resultados');

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.vacio button')!.click();
    harness.fixture.detectChanges();
    const limpia = responder(pagina([CARLOS]));
    await estable();
    expect(limpia.params.has('tipo')).toBe(false);
  });

  it('busca por texto tras una pausa al escribir', async () => {
    vi.useFakeTimers();
    try {
      await abrir();
      responder(pagina([CARLOS]));
      const buscar = harness.routeNativeElement!.querySelector<HTMLInputElement>('#buscar')!;
      buscar.value = 'González';
      buscar.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(300);
      harness.fixture.detectChanges();
      const peticion = responder(pagina([], { conteos: { historias: 1, archivadas: 0 } }));
      vi.useRealTimers();
      await estable();

      expect(peticion.params.get('texto')).toBe('González');
      expect(texto()).toContain('Sin resultados para "González"');
    } finally {
      vi.useRealTimers();
    }
  });

  it('§12.4: la pestaña Archivadas pide solo las archivadas y explica por qué', async () => {
    await abrir('/historias?vista=archivadas');
    const peticion = responder(
      pagina([{ ...CARLOS, archivada: true, fechaArchivo: '2026-10-15T12:00:00.000Z' }]),
    );
    await estable();

    expect(peticion.params.get('archivadas')).toBe('true');
    expect(texto()).toContain('Las historias archivadas tienen registros clínicos');
    expect(texto()).toContain('Archivada');
    expect(texto()).toContain('historias archivadas');
    // El filtro de estado no aplica a las archivadas.
    expect(harness.routeNativeElement?.querySelector('#filtro-estado')).toBeNull();
  });

  it('pagina con Anterior/Siguiente', async () => {
    await abrir();
    responder(pagina([CARLOS], { total: 25 }));
    await estable();

    const botones =
      harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('.paginas button');
    expect(botones[0]!.disabled).toBe(true);
    botones[1]!.click();
    harness.fixture.detectChanges();
    const siguiente = responder(pagina([CARLOS], { total: 25, pagina: 2 }));
    await estable();

    expect(siguiente.params.get('pagina')).toBe('2');
    expect(texto()).toContain('Mostrando 21–21 de 25 historias');
  });

  it('muestra un error si la API falla', async () => {
    await abrir();
    http
      .expectOne((r) => r.url === '/api/v1/historias')
      .flush(null, { status: 500, statusText: 'Error' });
    await estable();

    expect(texto()).toContain('No se pudieron cargar las historias');
  });

  it('B05/AC-014: desarchiva desde la pestaña Archivadas y recarga el listado', async () => {
    await abrir('/historias?vista=archivadas');
    responder(pagina([{ ...CARLOS, archivada: true, fechaArchivo: '2026-10-15T12:00:00.000Z' }]));
    await estable();

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.enlace-accion')!.click();
    http.expectOne('/api/v1/historias/h1/desarchivar').flush({ historia: CARLOS });
    harness.fixture.detectChanges();

    const recarga = responder(pagina([], { conteos: { historias: 1, archivadas: 0 } }));
    await estable();
    expect(recarga.params.get('archivadas')).toBe('true');
  });
});
