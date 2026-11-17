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
    telefono: '0412-555-0134',
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
      telefono: '0412-555-0134',
      correo: null,
      dirEstado: null,
      dirMunicipio: null,
      dirParroquia: null,
      dirComunidad: null,
      contactoNombre: 'Patricia Andrade',
      contactoParentesco: 'Esposa',
      contactoTelefono: '0414-555-2290',
      demandasFisicas: null,
      fuenteInformacion: [],
    },
    representante: null,
    camposFaltantes: ['fuenteInformacion', 'nivelEducativo'],
    puedeIniciarValoracion: false,
    otrasHistorias: [
      { idHistoria: 'h2', tipo: 'TRAUMA_ADULTO', estado: 'ACTIVA', archivada: false },
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
  });

  it('con los datos completos indica que la valoración llega en la próxima fase', async () => {
    const elemento = await abrir(
      neuroCarlos({ camposFaltantes: [], puedeIniciarValoracion: true, otrasHistorias: [] }),
    );
    const texto = elemento.textContent ?? '';

    expect(texto).not.toContain('Historia guardada como borrador.');
    expect(texto).toContain('Los datos personales están completos.');
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
    expect(texto).toContain('Completada. Con ella la historia pasó a Activa.');
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
          fechaNacimiento: '1991-07-30',
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
    expect(texto).toContain('30/07/1991');
    expect(texto).toMatch(/\d+ años/);
    expect(texto).toContain('Representante: cédula');
  });
});
