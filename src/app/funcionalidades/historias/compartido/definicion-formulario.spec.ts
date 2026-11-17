import type { DatosPersonales } from '../../../core/historias/historias.model';
import {
  camposFaltantes,
  resumirFaltantes,
  seccionesDe,
  totalExigibles,
} from './definicion-formulario';

function carlos(cambios: Partial<DatosPersonales> = {}): DatosPersonales {
  return {
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
    modalidad: 'CENTRO',
    idCentro: 'c1',
    ...cambios,
  };
}

describe('definición del formulario por tipo (SPEC §8)', () => {
  it('Neurología incluye la fuente de información y Traumatología las demandas físicas', () => {
    const claves = (tipo: Parameters<typeof seccionesDe>[0]) =>
      seccionesDe(tipo).flatMap((s) => s.campos.map((c) => c.clave));
    expect(claves('NEURO_ADULTO')).toContain('fuenteInformacion');
    expect(claves('NEURO_ADULTO')).not.toContain('demandasFisicas');
    expect(claves('TRAUMA_ADULTO')).toContain('demandasFisicas');
    expect(claves('ADULTO_MAYOR')).toEqual(expect.arrayContaining(['dirEstado', 'estadoCivil']));
    expect(seccionesDe('REHAB_INFANTIL')[0]!.campos[0]!.etiqueta).toBe('Nombre del niño o niña');
  });

  it('calcula los faltantes como el backend (B20: a Neurología le faltan fuente y nivel)', () => {
    expect(camposFaltantes('TRAUMA_ADULTO', carlos())).toEqual([]);
    expect(camposFaltantes('NEURO_ADULTO', carlos())).toEqual([
      'fuenteInformacion',
      'nivelEducativo',
    ]);
    expect(camposFaltantes('REHAB_INFANTIL', carlos({ cedula: null }))).toContain('documento');
    // Sin representante faltan sus 8 datos; con él completo, ninguno.
    expect(
      camposFaltantes('REHAB_INFANTIL', carlos()).filter((c) => c.startsWith('representante.')),
    ).toHaveLength(8);
    expect(
      camposFaltantes('REHAB_INFANTIL', carlos(), {
        parentesco: 'MADRE',
        nombre: 'Laura',
        apellido: 'Martínez',
        cedula: '18220417',
        fechaNacimiento: '1991-07-30',
        estadoCivil: 'Casado(a)',
        gradoInstruccion: 'Universitario',
        ocupacion: 'Docente',
      }).filter((c) => c.startsWith('representante.')),
    ).toEqual([]);
    expect(
      camposFaltantes('REHAB_INFANTIL', carlos({ cedula: null, sinDocumento: true })),
    ).not.toContain('documento');
  });

  it('cuenta los datos exigibles sin nombre, apellido, edad ni correo', () => {
    // v1.4: + modalidad; + centro (en centro) o + dirección (a domicilio, Trauma/Neuro).
    expect(totalExigibles('TRAUMA_ADULTO')).toBe(11);
    expect(totalExigibles('TRAUMA_ADULTO', 'CENTRO')).toBe(12);
    expect(totalExigibles('TRAUMA_ADULTO', 'DOMICILIO')).toBe(15);
    // Infantil: 9 propios + 8 del representante (RF-015); ya pide la dirección.
    expect(totalExigibles('REHAB_INFANTIL')).toBe(17);
    expect(totalExigibles('REHAB_INFANTIL', 'DOMICILIO')).toBe(17);
  });

  it('resume los faltantes por sección y recorta las listas largas', () => {
    expect(resumirFaltantes('NEURO_ADULTO', ['fuenteInformacion', 'nivelEducativo'])).toEqual([
      'Fuente de información',
      'Nivel educativo',
    ]);
    expect(resumirFaltantes('TRAUMA_ADULTO', ['documento'])).toEqual([
      'Documento o "Sin documento"',
    ]);
    expect(
      resumirFaltantes('ADULTO_MAYOR', ['dirEstado', 'dirMunicipio', 'dirParroquia', 'telefono']),
    ).toEqual(['Teléfono', 'Residencia (3 datos)']);
    expect(
      resumirFaltantes('REHAB_INFANTIL', ['representante.nombre', 'representante.apellido']),
    ).toEqual(['Representante: nombre', 'Representante: apellido']);
    expect(
      resumirFaltantes('REHAB_INFANTIL', [
        'representante.nombre',
        'representante.apellido',
        'representante.cedula',
      ]),
    ).toEqual(['Representante (3 datos)']);
    // Dos por sección: ninguna se agrupa y salen 8 líneas.
    const muchos = resumirFaltantes('ADULTO_MAYOR', [
      'documento',
      'fechaNacimiento',
      'estadoCivil',
      'lugarNacimiento',
      'dirEstado',
      'dirMunicipio',
      'contactoNombre',
      'contactoTelefono',
    ]);
    expect(muchos).toHaveLength(6);
    expect(muchos.at(-1)).toBe('y 3 datos más');
  });
});
