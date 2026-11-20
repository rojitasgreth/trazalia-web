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
    expect(texto).toContain('0 de 11');
    // RF-025: en adultos no existe "Sin documento".
    expect(texto).not.toContain('Sin documento');
  });

  it('la nacionalidad trae V por defecto y solo ofrece V o E', async () => {
    await abrir();

    const nacionalidad = elemento().querySelector<HTMLSelectElement>('#nacionalidad')!;
    expect(nacionalidad.value).toBe('V');
    expect([...nacionalidad.options].map((opcion) => opcion.value)).toEqual(['V', 'E']);
  });

  it('limita la cédula a 9 caracteres y los teléfonos a 11 dígitos', async () => {
    const pagina = await abrir();

    expect(elemento().querySelector('#cedula')?.getAttribute('maxlength')).toBe('9');
    expect(elemento().querySelector('#telefono')?.getAttribute('maxlength')).toBe('11');
    expect(elemento().querySelector('#contactoTelefono')?.getAttribute('maxlength')).toBe('11');

    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      cedula: '1',
      telefono: '041255501345',
    });
    await enviar();
    expect(elemento().textContent).toContain('El teléfono solo admite dígitos, máximo 11.');
    http.expectNone('/api/v1/historias');
  });

  it('en infantil sin cédula no envía la nacionalidad por defecto', async () => {
    const pagina = await abrir('REHAB_INFANTIL');
    rellenar(pagina, { nombre: 'Sofía', apellido: 'Ramírez' });

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body).toMatchObject({ nacionalidad: null, cedula: null });
    peticion.flush({ historia: { idHistoria: 'h1' } });
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
      cedula: '15482301',
      fechaNacimiento: '1985-03-14',
      telefono: '04125550134',
    });

    expect((elemento().querySelector('#edad') as HTMLInputElement).value).toMatch(/^\d+ años$/);
    expect(elemento().textContent).toContain('3 de 11');

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

    elemento().querySelector<HTMLButtonElement>('.hc-banner-boton')!.click();
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
    expect(elemento().textContent).toContain('0 de 17');

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
        cedula: '12345678',
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

  function salirDeCampo() {
    elemento().querySelector('form')!.dispatchEvent(new FocusEvent('focusout'));
  }

  it('B14/B15/AC-007: ofrece autocompletar con otra historia del paciente y marca lo copiado', async () => {
    const pagina = await abrir('NEURO_ADULTO');
    rellenar(pagina, { nacionalidad: 'V', cedula: '15482301' });

    salirDeCampo();
    const consulta = http.expectOne('/api/v1/historias/coincidencias');
    expect(consulta.request.body).toMatchObject({
      tipo: 'NEURO_ADULTO',
      nacionalidad: 'V',
      cedula: '15482301',
    });
    consulta.flush({
      resultado: 'autocompletar',
      historia: { ...EXISTENTE, tipo: 'TRAUMA_ADULTO' },
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
        telefono: '04125550134',
        correo: null,
        dirEstado: null,
        dirMunicipio: null,
        dirParroquia: null,
        dirComunidad: null,
        contactoNombre: 'Patricia Andrade',
        contactoParentesco: 'Esposa',
        contactoTelefono: '04145552290',
        demandasFisicas: null,
        fuenteInformacion: [],
        modalidad: null,
        idCentro: null,
      },
    });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    const dialogo = elemento().querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain('Encontramos otra historia de este paciente');
    expect(dialogo.textContent).toContain('tiene una historia de Traumatología del adulto');
    expect(dialogo.textContent).toContain('No existe en esa historia');

    Array.from(dialogo.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Usar estos datos'))!
      .click();
    harness.fixture.detectChanges();

    expect((elemento().querySelector('#nombre') as HTMLInputElement).value).toBe('Carlos');
    expect((elemento().querySelector('#telefono') as HTMLInputElement).value).toBe('04125550134');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain(
      'Usamos los datos de su historia de Traumatología del adulto',
    );
    expect(elemento().textContent).toContain(
      'Fuente de información y Nivel educativo no existen en esa historia',
    );
    expect(elemento().querySelector('#telefono')?.getAttribute('data-insignia')).toBe(
      'Autocompletado',
    );
    expect(elemento().textContent).toContain('Carlos Andrade · V-15.482.301');

    // Misma combinación: no se vuelve a consultar.
    salirDeCampo();
    http.expectNone('/api/v1/historias/coincidencias');
  });

  it('B13: un duplicado detectado al salir del campo se avisa antes de guardar', async () => {
    const pagina = await abrir();
    rellenar(pagina, { nacionalidad: 'V', cedula: '15482301' });

    salirDeCampo();
    http
      .expectOne('/api/v1/historias/coincidencias')
      .flush({ resultado: 'duplicado', historia: EXISTENTE });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(elemento().querySelector('[role="dialog"]')?.textContent).toContain(
      'Este paciente ya tiene una historia de Traumatología del adulto',
    );
  });

  it('"Empezar en blanco" cierra la propuesta sin copiar nada', async () => {
    const pagina = await abrir('NEURO_ADULTO');
    rellenar(pagina, { nacionalidad: 'V', cedula: '15482301' });
    salirDeCampo();
    http.expectOne('/api/v1/historias/coincidencias').flush({
      resultado: 'autocompletar',
      historia: { ...EXISTENTE, tipo: 'TRAUMA_ADULTO' },
      datos: { nombre: 'Carlos', apellido: 'Andrade', fuenteInformacion: [] },
    });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    Array.from(elemento().querySelectorAll('[role="dialog"] button'))
      .find((b) => b.textContent?.includes('Empezar en blanco'))!
      .dispatchEvent(new Event('click'));
    harness.fixture.detectChanges();

    expect(elemento().querySelector('[role="dialog"]')).toBeNull();
    expect((elemento().querySelector('#nombre') as HTMLInputElement).value).toBe('');
  });

  it('v1.4 B28: a domicilio, Traumatología pide la dirección del paciente', async () => {
    const pagina = await abrir();
    const titulos = () =>
      Array.from(elemento().querySelectorAll('.seccion h2')).map((h) => h.textContent?.trim());
    expect(titulos()[1]).toBe('Modalidad de atención');
    expect(titulos()).not.toContain('Dirección del paciente');

    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      modalidad: 'DOMICILIO',
      dirEstado: 'Miranda',
    });
    expect(titulos()[2]).toBe('Dirección del paciente');
    expect(elemento().textContent).toContain('Registra abajo la dirección del paciente.');

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body).toMatchObject({
      modalidad: 'DOMICILIO',
      idCentro: null,
      dirEstado: 'Miranda',
    });
    peticion.flush({ historia: { idHistoria: 'h7' } });
  });

  it('v1.4 B29: en centro médico busca y envía el centro elegido', async () => {
    const pagina = await abrir('NEURO_ADULTO');
    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      modalidad: 'CENTRO',
    });
    expect(elemento().querySelector('app-buscador-centro')).not.toBeNull();
    (pagina as unknown as { elegirCentro(c: object): void }).elegirCentro({
      idCentro: 'c1',
      nombre: 'Clínica Santa Sofía',
      estado: 'Miranda',
      municipio: 'Sucre',
      parroquia: 'Petare',
      comunidad: null,
    });
    harness.fixture.detectChanges();
    expect(elemento().textContent).toContain('Clínica Santa Sofía');

    await enviar();
    const peticion = http.expectOne('/api/v1/historias');
    expect(peticion.request.body).toMatchObject({ modalidad: 'CENTRO', idCentro: 'c1' });
    expect(peticion.request.body).not.toHaveProperty('dirEstado');
    peticion.flush({ historia: { idHistoria: 'h8' } });
  });

  it('muestra el error del backend si el centro no existe', async () => {
    const pagina = await abrir();
    rellenar(pagina, {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      modalidad: 'CENTRO',
      idCentro: 'c-borrado',
    });

    await enviar();
    http.expectOne('/api/v1/historias').flush(
      {
        mensaje: 'El centro médico seleccionado no existe.',
        errores: [{ campo: 'centro', mensaje: 'El centro médico seleccionado no existe.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();

    expect(elemento().querySelector('#centro-msg')?.textContent).toContain(
      'El centro médico seleccionado no existe.',
    );
  });
});
