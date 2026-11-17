import type { DatosPersonales } from '../../../core/historias/historias.model';
import { camposCambiados, filasDeCambios } from './propagacion';

const ANTES: DatosPersonales = {
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
  contactoNombre: null,
  contactoParentesco: null,
  contactoTelefono: null,
  demandasFisicas: 'Oficina',
  fuenteInformacion: [],
};

describe('cambios compartidos (SPEC §10.2)', () => {
  it('ignora fuente de información y demandas físicas, que no se comparten', () => {
    expect(
      camposCambiados(ANTES, { ...ANTES, demandasFisicas: 'Otra', fuenteInformacion: ['Mixta'] }),
    ).toEqual([]);
    expect(camposCambiados(ANTES, { ...ANTES, telefono: '0424-555-8890' })).toEqual(['telefono']);
  });

  it('B17: describe cada cambio como "antes → después" y une el documento', () => {
    const despues = {
      ...ANTES,
      telefono: '0424-555-8890',
      nacionalidad: 'E' as const,
      cedula: '81234567',
      sexo: null,
      fechaNacimiento: '1985-03-15',
    };

    expect(filasDeCambios('TRAUMA_ADULTO', ANTES, despues)).toEqual([
      { etiqueta: 'Documento', antes: 'V-15.482.301', despues: 'E-81.234.567' },
      { etiqueta: 'Fecha de nacimiento', antes: '14/03/1985', despues: '15/03/1985' },
      { etiqueta: 'Sexo', antes: 'Masculino', despues: '—' },
      { etiqueta: 'Teléfono', antes: '0412-555-0134', despues: '0424-555-8890' },
    ]);
  });
});
