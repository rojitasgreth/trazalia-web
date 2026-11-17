import type { DatosPersonales } from '../../../core/historias/historias.model';
import { enumerar, planDeAutocompletado } from './autocompletado';

const CARLOS_TRAUMA: DatosPersonales = {
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
  contactoTelefono: null,
  // El backend ya no envía los datos propios del tipo (§8.3).
  demandasFisicas: null,
  fuenteInformacion: [],
};

describe('planDeAutocompletado (SPEC §10.1)', () => {
  it('B14: de Traumatología a Neurología copia lo común y avisa de lo que no existe', () => {
    const plan = planDeAutocompletado(
      'NEURO_ADULTO',
      'TRAUMA_ADULTO',
      CARLOS_TRAUMA,
      'V-15.482.301',
    );

    expect(plan.valores).toEqual({
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      sinDocumento: false,
      fechaNacimiento: '1985-03-14',
      sexo: 'MASCULINO',
      dominancia: 'Diestro(a)',
      ocupacion: 'Contador · fútbol amateur',
      telefono: '0412-555-0134',
      contactoNombre: 'Patricia Andrade',
      contactoParentesco: 'Esposa',
    });
    expect(plan.ausentes).toEqual(['Fuente de información', 'Nivel educativo']);
    expect(plan.filas).toContainEqual({
      etiqueta: 'Fecha de nacimiento',
      valor: '14/03/1985',
      existe: true,
    });
    expect(plan.filas).toContainEqual({ etiqueta: 'Sexo', valor: 'Masculino', existe: true });
    expect(plan.filas).toContainEqual({
      etiqueta: 'Nivel educativo',
      valor: 'No existe en esa historia',
      existe: false,
    });
    // Un dato vacío en el origen no se copia ni se lista.
    expect(plan.filas.map((f) => f.etiqueta)).not.toContain('Teléfono ');
    expect(plan.valores).not.toHaveProperty('contactoTelefono');
  });

  it('enumera con comas y "y"', () => {
    expect(enumerar([])).toBe('');
    expect(enumerar(['a'])).toBe('a');
    expect(enumerar(['a', 'b', 'c'])).toBe('a, b y c');
  });
});
