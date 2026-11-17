import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { HistoriaDetalle } from '../../core/historias/historias.model';
import { PaginaFormularioHistoria } from './pagina-formulario-historia';

const EXISTENTE = {
  idHistoria: 'h-existente',
  tipo: 'TRAUMA_ADULTO',
  estado: 'ACTIVA',
  archivada: false,
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15482301',
  sinDocumento: false,
  fechaActualizacion: '2026-11-09T12:00:00.000Z',
} as HistoriaDetalle;

describe('PaginaFormularioHistoria', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'historias/nueva/:tipo', component: PaginaFormularioHistoria },
          { path: '**', children: [] },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function abrir(tipo = 'TRAUMA_ADULTO'): Promise<PaginaFormularioHistoria> {
    return harness.navigateByUrl(`/historias/nueva/${tipo}`, PaginaFormularioHistoria);
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

  async function enviar() {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  it('B07: muestra las secciones del tipo y los requisitos para crear', async () => {
    await abrir();

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Traumatología del adulto · se guardará como borrador');
    expect(texto).toContain('Contacto de emergencia');
    expect(texto).toContain('Demandas físicas');
    expect(texto).toContain('Cédula (V o E + número)');
    expect(texto).toContain('0 de 10');
    // RF-025: en adultos no existe "Sin documento".
    expect(texto).not.toContain('Sin documento');
  });

  it('B12/AC-004: sin nombre, apellido ni cédula no envía y explica qué falta', async () => {
    await abrir();

    await enviar();

    const alerta = elemento().querySelector('[role="alert"]')?.textContent ?? '';
    expect(alerta).toContain('Faltan 3 datos para crear la historia');
    expect(alerta).toContain('Escribe el nombre, el apellido y la cédula.');
    expect(elemento().textContent).toContain(
      'Escribe la nacionalidad y el número de cédula. Son obligatorios para crear la historia.',
    );
    expect(elemento().querySelector('#cedula')?.getAttribute('aria-invalid')).toBe('true');
    http.expectNone('/api/v1/historias');
  });

  it('RF-006/RF-026: crea con solo los campos del tipo y calcula la edad', async () => {
    const pagina = await abrir();
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, {
      nombre: ' Carlos ',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15.482.301',
      fechaNacimiento: '1985-03-14',
      telefono: '0412-555-0134',
    });

    expect((elemento().querySelector('#edad') as HTMLInputElement).value).toMatch(/^\d+ años$/);
    expect(elemento().textContent).toContain('3 de 10');

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body).toMatchObject({
      tipo: 'TRAUMA_ADULTO',
      nombre: 'Carlos',
      cedula: '15482301',
      fechaNacimiento: '1985-03-14',
      demandasFisicas: null,
      sinDocumento: false,
    });
    expect(peticion.request.body).not.toHaveProperty('nivelEducativo');
    expect(peticion.request.body).not.toHaveProperty('edad');
    peticion.flush({ historia: { idHistoria: 'h1' } });
    await harness.fixture.whenStable();

    expect(router.navigate).toHaveBeenCalledWith(['/historias', 'h1'], {
      state: { guardada: true },
    });
  });

  it('Neurología pide la fuente de información con varias casillas', async () => {
    const pagina = await abrir('NEURO_ADULTO');
    rellenar(pagina, { nombre: 'Carlos', apellido: 'Andrade', nacionalidad: 'V', cedula: '1' });
    const casillas = elemento().querySelectorAll<HTMLInputElement>('.grupo input[type="checkbox"]');
    expect(casillas).toHaveLength(4);
    casillas[0]!.click();
    casillas[1]!.click();
    casillas[1]!.click();
    casillas[2]!.click();
    harness.fixture.detectChanges();

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body.fuenteInformacion).toEqual(['Paciente', 'Historia']);
    expect(peticion.request.body).not.toHaveProperty('demandasFisicas');
    peticion.flush({ historia: { idHistoria: 'h2' } });
  });

  it('B13/AC-006: ante un duplicado muestra la historia existente y permite abrirla', async () => {
    const pagina = await abrir();
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
    });

    await enviar();
    http
      .expectOne('/api/v1/historias')
      .flush(
        { mensaje: 'Ya existe.', idHistoriaExistente: 'h-existente' },
        { status: 409, statusText: 'Conflict' },
      );
    http.expectOne('/api/v1/historias/h-existente').flush({ historia: EXISTENTE });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    const dialogo = elemento().querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain(
      'Este paciente ya tiene una historia de Traumatología del adulto',
    );
    expect(dialogo.textContent).toContain('Coincide la cédula V-15.482.301.');

    const [volver, abrirExistente] = Array.from(dialogo.querySelectorAll('button'));
    abrirExistente!.click();
    expect(navegar).toHaveBeenCalledWith(['/historias', 'h-existente']);
    volver!.click();
    harness.fixture.detectChanges();
    expect(elemento().querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra los mensajes de validación que devuelve el backend (400)', async () => {
    const pagina = await abrir();
    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
    });

    await enviar();
    http.expectOne('/api/v1/historias').flush(
      {
        mensaje: 'Faltan datos para crear la historia.',
        errores: [
          { campo: 'documento', mensaje: 'La cédula debe contener solo dígitos, máximo 9.' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(elemento().textContent).toContain('La cédula debe contener solo dígitos, máximo 9.');
  });

  it('B19: si falla el guardado conserva lo escrito y permite reintentar', async () => {
    const pagina = await abrir();
    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'E',
      cedula: '81234567',
    });

    await enviar();
    http.expectOne('/api/v1/historias').flush(null, { status: 0, statusText: 'Unknown Error' });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(elemento().textContent).toContain('No pudimos guardar la historia');
    expect((elemento().querySelector('#nombre') as HTMLInputElement).value).toBe('Carlos');

    elemento().querySelector<HTMLButtonElement>('.banner-boton')!.click();
    http.expectOne('/api/v1/historias').flush({ historia: { idHistoria: 'h3' } });
  });

  it('marca el teléfono con formato inválido', async () => {
    const pagina = await abrir();
    rellenar(pagina, { telefono: 'abc' });

    await enviar();

    expect(elemento().textContent).toContain('El teléfono solo admite dígitos');
    http.expectNone('/api/v1/historias');
  });

  it('B10/AC-018: en infantil pide primero el representante y permite guardar sin él', async () => {
    const pagina = await abrir('REHAB_INFANTIL');
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const titulos = Array.from(elemento().querySelectorAll('.seccion h2')).map(
      (h) => h.textContent,
    );
    expect(titulos[0]).toBe('Representante');
    expect(titulos[1]).toBe('Niño o niña');
    expect(elemento().textContent).toContain('Puedes guardar sin representante');
    expect(elemento().textContent).toContain('0 de 16');

    // RF-004: sin documento exige la fecha de nacimiento.
    rellenar(pagina, { nombre: 'Sofía', apellido: 'Martínez', sinDocumento: true });
    expect((elemento().querySelector('#cedula') as HTMLInputElement).disabled).toBe(true);
    await enviar();
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain(
      'Escribe la fecha de nacimiento.',
    );
    http.expectNone('/api/v1/historias');

    rellenar(pagina, { fechaNacimiento: '2022-06-10' });
    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body).toMatchObject({
      tipo: 'REHAB_INFANTIL',
      sinDocumento: true,
      nacionalidad: null,
      cedula: null,
      representante: null,
    });
    peticion.flush({ historia: { idHistoria: 'h4' } });
  });

  it('RF-015: envía el representante normalizado y calcula su edad', async () => {
    const pagina = await abrir('REHAB_INFANTIL');
    rellenar(pagina, {
      nombre: 'Mateo',
      apellido: 'Rivas',
      representante: {
        parentesco: 'PADRE',
        nombre: ' José ',
        cedula: '12.345.678',
        fechaNacimiento: '1988-01-20',
      },
    });

    expect((elemento().querySelector('#representante-edad') as HTMLInputElement).value).toMatch(
      /años$/,
    );
    expect(elemento().textContent).not.toContain('Puedes guardar sin representante');

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body.representante).toEqual({
      parentesco: 'PADRE',
      nombre: 'José',
      apellido: null,
      cedula: '12345678',
      fechaNacimiento: '1988-01-20',
      estadoCivil: null,
      gradoInstruccion: null,
      ocupacion: null,
    });
    peticion.flush({ historia: { idHistoria: 'h5' } });
  });

  it('marca una cédula de representante con formato inválido', async () => {
    const pagina = await abrir('REHAB_INFANTIL');
    rellenar(pagina, {
      nombre: 'Mateo',
      apellido: 'Rivas',
      representante: { cedula: '1234567890' },
    });

    await enviar();

    expect(elemento().textContent).toContain(
      'La cédula del representante debe contener solo dígitos, máximo 9.',
    );
    http.expectNone('/api/v1/historias');
  });
});
