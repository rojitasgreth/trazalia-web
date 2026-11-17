import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { HistoriaDetalle } from '../../core/historias/historias.model';
import { PaginaFormularioHistoria } from './pagina-formulario-historia';

function trauma(cambios: Partial<HistoriaDetalle> = {}): HistoriaDetalle {
  return {
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
    datos: {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      sinDocumento: false,
      fechaNacimiento: '1985-03-14',
      sexo: 'MASCULINO',
      dominancia: 'Diestro(a)',
      ocupacion: 'Contador',
      nivelEducativo: null,
      estadoCivil: null,
      lugarNacimiento: null,
      telefono: '0412-555-0134',
      correo: null,
      dirEstado: null,
      dirMunicipio: null,
      dirParroquia: null,
      dirComunidad: null,
      contactoNombre: 'Patricia Andrade',
      contactoParentesco: 'Esposa',
      contactoTelefono: '0414-555-2290',
      demandasFisicas: 'Oficina',
      fuenteInformacion: [],
    },
    representante: null,
    camposFaltantes: [],
    puedeIniciarValoracion: false,
    otrasHistorias: [
      {
        idHistoria: 'h2',
        tipo: 'NEURO_ADULTO',
        estado: 'BORRADOR',
        archivada: false,
        sinDocumento: false,
      },
      {
        idHistoria: 'h3',
        tipo: 'ADULTO_MAYOR',
        estado: 'ACTIVA',
        archivada: true,
        sinDocumento: false,
      },
    ],
    ...cambios,
  };
}

describe('PaginaFormularioHistoria (edición, B16–B18)', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;
  let historia: HistoriaDetalle;

  beforeEach(async () => {
    historia = trauma();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          {
            path: 'historias/:id/editar',
            component: PaginaFormularioHistoria,
            resolve: { historia: () => historia },
          },
          { path: '**', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function abrir(): Promise<PaginaFormularioHistoria> {
    const pagina = await harness.navigateByUrl('/historias/h1/editar', PaginaFormularioHistoria);
    harness.fixture.detectChanges();
    return pagina;
  }

  function elemento(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  function rellenar(pagina: PaginaFormularioHistoria, valores: Record<string, unknown>) {
    (pagina as unknown as { formulario: { patchValue(v: object): void } }).formulario.patchValue(
      valores,
    );
    harness.fixture.detectChanges();
  }

  async function guardar() {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  function boton(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    )!;
  }

  it('B16: carga los datos guardados y explica que hay otras historias', async () => {
    await abrir();
    const texto = elemento().textContent ?? '';

    expect(elemento().querySelector('h1')?.textContent).toBe('Editar datos personales');
    expect((elemento().querySelector('#ocupacion') as HTMLInputElement).value).toBe('Contador');
    expect((elemento().querySelector('#cedula') as HTMLInputElement).value).toBe('15482301');
    expect(texto).toContain('Carlos Andrade · V-15.482.301');
    expect(texto).toContain('Activa');
    // La archivada no cuenta como afectada (§10.2).
    expect(texto).toContain('Este paciente tiene otra historia (Neurología del adulto)');
    expect(texto).toContain('Guardar cambios');
    expect(texto).toContain('Esta historia está Activa');
    expect(elemento().querySelector('a.volver')?.getAttribute('href')).toBe('/historias/h1');
  });

  it('B16/B17/AC-010: marca lo modificado y pregunta si propagar; "Actualizar ambas" propaga', async () => {
    const pagina = await abrir();
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, { telefono: '0424-555-8890' });

    expect(elemento().querySelector('#telefono')?.getAttribute('data-insignia')).toBe('Modificado');
    expect(elemento().textContent).toContain('Antes: 0412-555-0134');

    await guardar();
    const dialogo = elemento().querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain('¿Actualizar también su otra historia?');
    expect(dialogo.textContent).toContain('0412-555-0134 → 0424-555-8890');
    expect(dialogo.textContent).toContain('Neurología del adulto · Borrador');
    http.expectNone('/api/v1/historias/h1');

    boton('Actualizar ambas').click();
    const peticion = http.expectOne('/api/v1/historias/h1');
    expect(peticion.request.method).toBe('PATCH');
    expect(peticion.request.body).toMatchObject({ telefono: '0424-555-8890', propagar: true });
    expect(peticion.request.body).not.toHaveProperty('tipo');
    peticion.flush({ historia });
    await harness.fixture.whenStable();

    expect(navegar).toHaveBeenCalledWith(['/historias', 'h1'], { state: { actualizada: true } });
  });

  it('"Solo esta historia" guarda sin propagar', async () => {
    const pagina = await abrir();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, { telefono: '0424-555-8890' });
    await guardar();

    boton('Solo esta historia').click();
    const peticion = http.expectOne('/api/v1/historias/h1');
    expect(peticion.request.body.propagar).toBe(false);
    peticion.flush({ historia });
  });

  it('sin cambios en datos compartidos guarda directamente', async () => {
    const pagina = await abrir();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, { demandasFisicas: 'Trabajo de pie' });

    await guardar();

    expect(elemento().querySelector('[role="dialog"]')).toBeNull();
    const peticion = http.expectOne('/api/v1/historias/h1');
    expect(peticion.request.body).toMatchObject({
      demandasFisicas: 'Trabajo de pie',
      propagar: false,
    });
    peticion.flush({ historia });
  });

  it('B18: si la propagación falla ofrece guardar solo en esta', async () => {
    const pagina = await abrir();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, { telefono: '0424-555-8890' });
    await guardar();
    boton('Actualizar ambas').click();
    http.expectOne('/api/v1/historias/h1').flush(null, { status: 500, statusText: 'Error' });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    const dialogo = elemento().querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain('No pudimos guardar los cambios');
    expect(dialogo.textContent).toContain('No se modificó ninguna');

    boton('Guardar solo en esta').click();
    const reintento = http.expectOne('/api/v1/historias/h1');
    expect(reintento.request.body.propagar).toBe(false);
    reintento.flush({ historia });
  });

  it('muestra el conflicto que devuelve el backend (409)', async () => {
    historia = trauma({ otrasHistorias: [] });
    const pagina = await abrir();
    rellenar(pagina, { cedula: '99999999' });

    await guardar();
    http
      .expectOne('/api/v1/historias/h1')
      .flush(
        { mensaje: 'Ese documento ya pertenece a otro paciente en tus historias.' },
        { status: 409, statusText: 'Conflict' },
      );
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Ese documento ya pertenece a otro paciente',
    );
  });

  it('en infantil carga el representante guardado', async () => {
    historia = trauma({
      tipo: 'REHAB_INFANTIL',
      otrasHistorias: [],
      representante: {
        parentesco: 'MADRE',
        nombre: 'Laura',
        apellido: null,
        cedula: null,
        fechaNacimiento: null,
        estadoCivil: null,
        gradoInstruccion: null,
        ocupacion: null,
      },
    });
    await abrir();

    expect((elemento().querySelector('#representante-nombre') as HTMLInputElement).value).toBe(
      'Laura',
    );
    expect((elemento().querySelector('#representante-parentesco') as HTMLSelectElement).value).toBe(
      'MADRE',
    );
  });
});
