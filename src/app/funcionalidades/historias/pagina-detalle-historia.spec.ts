import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { HistoriaDetalle } from '../../core/historias/historias.model';
import { PaginaDetalleHistoria } from './pagina-detalle-historia';

@Component({ template: '' })
class Vacia {}

function neuroCarlos(cambios: Partial<HistoriaDetalle> = {}): HistoriaDetalle {
  return {
    idHistoria: 'h1',
    tipo: 'NEURO_ADULTO',
    estado: 'BORRADOR',
    archivada: false,
    nombre: 'Carlos',
    apellido: 'Andrade',
    nacionalidad: 'V',
    cedula: '15482301',
    sinDocumento: false,
    telefono: '04125550134',
    fechaNacimiento: '1985-03-14',
    fechaCreacion: '2026-11-16T12:12:00.000Z',
    fechaActualizacion: '2026-11-16T12:12:00.000Z',
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
      ocupacion: 'Contador · fútbol amateur',
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
    representante: null,
    datosInfantiles: null,
    camposFaltantes: ['fuenteInformacion', 'nivelEducativo'],
    puedeIniciarValoracion: false,
    tieneRegistrosClinicos: false,
    centro: null,
    otrasHistorias: [
      {
        idHistoria: 'h2',
        tipo: 'TRAUMA_ADULTO',
        estado: 'ACTIVA',
        archivada: false,
        sinDocumento: false,
        modalidad: null,
      },
    ],
    ...cambios,
  };
}

describe('PaginaDetalleHistoria', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'historias/:id', component: PaginaDetalleHistoria },
          { path: 'origen', component: Vacia },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function abrir(historia: HistoriaDetalle | null, estado?: object) {
    const navegacion = estado
      ? TestBed.inject(Router).navigate(['/historias', 'h1'], { state: estado })
      : harness.navigateByUrl('/historias/h1');
    await navegacion;
    harness.fixture.detectChanges();
    const peticion = http.expectOne('/api/v1/historias/h1');
    if (historia) peticion.flush({ historia });
    else peticion.flush(null, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
    return harness.routeNativeElement as HTMLElement;
  }

  it('B20: muestra datos, faltantes, primera valoración bloqueada y otras historias', async () => {
    const elemento = await abrir(neuroCarlos(), { guardada: true });
    const texto = elemento.textContent ?? '';

    expect(texto).toContain('Historia guardada como borrador.');
    expect(elemento.querySelector('h1')?.textContent).toContain('Carlos Andrade');
    expect(texto).toMatch(/V-15\.482\.301 · \d+ años/);
    expect(texto).toContain('Neurología del adulto');
    expect(texto).toContain('Borrador');
    expect(texto).toContain('Masculino');
    expect(texto).toContain('1 dato por completar');
    // Panel de la primera valoración (RF-016/RF-017).
    expect(texto).toContain('Aún no se puede iniciar. Falta completar:');
    expect(texto).toContain('Fuente de información');
    expect(texto).toContain('Nivel educativo');
    expect(elemento.querySelector<HTMLButtonElement>('.boton-valoracion')?.disabled).toBe(true);
    // Otras historias del mismo paciente (RF-011).
    const otra = elemento.querySelector('a.otra');
    expect(otra?.getAttribute('href')).toBe('/historias/h2');
    expect(otra?.textContent).toContain('Traumatología del adulto');
    expect(texto).toContain('Secciones clínicas');
    // RF-018: el propietario puede editar los datos personales.
    expect(elemento.querySelector('.acciones a')?.getAttribute('href')).toBe(
      '/historias/h1/editar',
    );
  });

  it('tras editar avisa de que los cambios se guardaron', async () => {
    const elemento = await abrir(neuroCarlos(), { actualizada: true });

    expect(elemento.textContent).toContain('Cambios guardados.');
    expect(elemento.textContent).not.toContain('Historia guardada como borrador.');
  });

  it('SPEC C §6: con los datos completos permite iniciar la valoración', async () => {
    const elemento = await abrir(
      neuroCarlos({ camposFaltantes: [], puedeIniciarValoracion: true, otrasHistorias: [] }),
    );
    const texto = elemento.textContent ?? '';

    expect(texto).not.toContain('Historia guardada como borrador.');
    expect(texto).toContain(
      'Los datos personales están completos: ya puedes iniciar la valoración.',
    );
    const boton = elemento.querySelector<HTMLButtonElement>('.boton-valoracion')!;
    expect(boton.textContent).toContain('Iniciar valoración');
    expect(boton.disabled).toBe(false);
    expect(texto).toContain('No tiene historias de otros tipos.');
  });

  it('una historia Activa y archivada muestra su estado de solo lectura', async () => {
    const elemento = await abrir(
      neuroCarlos({
        estado: 'ACTIVA',
        archivada: true,
        fechaArchivo: '2026-10-15T12:00:00.000Z',
        camposFaltantes: [],
      }),
    );
    const texto = elemento.textContent ?? '';

    expect(texto).toContain('Historia archivada el 15/10/2026.');
    // Solo lectura: sin acción de editar.
    expect(elemento.querySelector('.acciones a')).toBeNull();
    expect(texto).toContain('Finalizada. Con ella la historia pasó a Activa.');
    expect(elemento.querySelector('a.boton-valoracion')?.textContent).toContain('Ver valoración');
    expect(texto).toContain('Archivada');
  });

  it('AC-013: una historia ajena o inexistente se informa como no encontrada', async () => {
    const elemento = await abrir(null);

    expect(elemento.textContent).toContain('No encontramos esta historia.');
  });

  it('B22: una historia infantil sin representante lo muestra primero como "Sin registrar"', async () => {
    const elemento = await abrir(
      neuroCarlos({
        tipo: 'REHAB_INFANTIL',
        nacionalidad: null,
        cedula: null,
        sinDocumento: true,
        camposFaltantes: [
          'representante.parentesco',
          'representante.nombre',
          'representante.cedula',
        ],
      }),
    );

    const titulos = Array.from(elemento.querySelectorAll('.grupo h2')).map((h) => h.textContent);
    expect(titulos[0]).toBe('Representante');
    expect(elemento.textContent).toContain('Sin registrar');
    expect(elemento.textContent).toContain(
      'Registra al representante para poder iniciar la valoración.',
    );
    expect(elemento.textContent).toContain('Sin documento');
    expect(elemento.textContent).toContain('Representante (3 datos)');
    expect(
      Array.from(elemento.querySelectorAll('a'))
        .find((a) => a.textContent?.includes('Agregar representante'))
        ?.getAttribute('href'),
    ).toBe('/historias/h1/editar');
  });

  it('muestra los datos del representante registrado', async () => {
    const elemento = await abrir(
      neuroCarlos({
        tipo: 'REHAB_INFANTIL',
        representante: {
          parentesco: 'MADRE',
          nombre: 'Laura',
          apellido: 'Martínez',
          cedula: null,
          edad: 35,
          estadoCivil: null,
          gradoInstruccion: null,
          ocupacion: null,
        },
        camposFaltantes: ['representante.cedula'],
      }),
    );
    const texto = elemento.textContent ?? '';

    expect(texto).toContain('Madre');
    expect(texto).toContain('Laura');
    expect(texto).toContain('35 años');
    expect(texto).toContain('Representante: cédula');
  });

  function boton(elemento: HTMLElement, texto: string): HTMLButtonElement {
    return Array.from(elemento.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === texto,
    )!;
  }

  async function actualizar() {
    await harness.fixture.whenStable();
    harness.fixture.detectChanges();
  }

  it('B25/AC-015: sin registros, elimina tras confirmar y vuelve al listado', async () => {
    const elemento = await abrir(neuroCarlos());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(boton(elemento, 'Archivar')).toBeUndefined();

    boton(elemento, 'Eliminar').click();
    await actualizar();
    const dialogo = elemento.querySelector('[role="dialog"]')!;
    expect(dialogo.textContent).toContain('¿Eliminar esta historia definitivamente?');
    expect(dialogo.textContent).toContain('No se guarda copia de los datos.');
    const eliminar = boton(elemento, 'Eliminar definitivamente');
    expect(eliminar.disabled).toBe(true);

    dialogo.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await actualizar();
    expect(eliminar.disabled).toBe(false);
    eliminar.click();
    const peticion = http.expectOne('/api/v1/historias/h1');
    expect(peticion.request.method).toBe('DELETE');
    peticion.flush(null, { status: 204, statusText: 'No Content' });
    await actualizar();

    expect(navegar).toHaveBeenCalledWith(['/historias']);
  });

  it('B26/AC-014: con registros explica el bloqueo y ofrece archivar', async () => {
    const elemento = await abrir(neuroCarlos({ tieneRegistrosClinicos: true }));
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    boton(elemento, 'Eliminar').click();
    await actualizar();
    expect(elemento.querySelector('[role="dialog"]')?.textContent).toContain(
      'Esta historia no se puede eliminar',
    );
    boton(elemento, 'Archivar historia').click();
    http
      .expectOne('/api/v1/historias/h1/archivar')
      .flush({ historia: neuroCarlos({ archivada: true }) });
    await actualizar();

    expect(navegar).toHaveBeenCalledWith(['/historias'], { queryParams: { vista: 'archivadas' } });
  });

  it('B27: "Archivar" pide confirmación; un error se informa', async () => {
    const elemento = await abrir(neuroCarlos({ tieneRegistrosClinicos: true }));

    boton(elemento, 'Archivar').click();
    await actualizar();
    expect(elemento.querySelector('[role="dialog"]')?.textContent).toContain(
      '¿Archivar esta historia?',
    );
    Array.from(elemento.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((b) => b.textContent?.trim() === 'Archivar')!
      .click();
    http
      .expectOne('/api/v1/historias/h1/archivar')
      .flush(
        { mensaje: 'La historia ya está archivada.' },
        { status: 409, statusText: 'Conflict' },
      );
    await actualizar();

    expect(elemento.querySelector('[role="dialog"]')).toBeNull();
    expect(elemento.querySelector('.error')?.textContent).toContain(
      'La historia ya está archivada.',
    );
  });

  it('B24: una historia archivada se desarchiva desde el aviso', async () => {
    const elemento = await abrir(
      neuroCarlos({ archivada: true, fechaArchivo: '2026-10-15T12:00:00.000Z' }),
    );
    expect(boton(elemento, 'Eliminar')).toBeUndefined();

    boton(elemento, 'Desarchivar').click();
    http.expectOne('/api/v1/historias/h1/desarchivar').flush({ historia: neuroCarlos() });
    await actualizar();

    expect(elemento.textContent).not.toContain('Historia archivada el');
    expect(elemento.querySelector('.acciones a')?.textContent).toContain('Editar datos personales');
  });

  it('v1.4 B32: muestra la modalidad y el centro de atención', async () => {
    const base = neuroCarlos();
    const elemento = await abrir({
      ...base,
      datos: { ...base.datos, modalidad: 'CENTRO', idCentro: 'c1' },
      centro: {
        idCentro: 'c1',
        nombre: 'Clínica Santa Sofía',
        estado: 'Miranda',
        municipio: 'Sucre',
        parroquia: 'Petare',
        comunidad: null,
      },
    });

    const grupo = Array.from(elemento.querySelectorAll('.grupo')).find((g) =>
      g.querySelector('h2')?.textContent?.includes('Modalidad de atención'),
    )!;
    expect(grupo.textContent).toContain('Centro médico');
    expect(grupo.textContent).toContain('Clínica Santa Sofía · Petare, Sucre, Miranda');
  });
});
