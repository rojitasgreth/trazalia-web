import type { Ficha } from '../../core/valoraciones/valoraciones.model';
import {
  calcularImc,
  construirGrupo,
  contenidoDe,
  estructuraDe,
  textoDe,
} from './ficha-formulario';
import fichaAdultoMayor from './pruebas/ficha-adulto-mayor.json';
import fichaNeuro from './pruebas/ficha-neuro.json';
import fichaTrauma from './pruebas/ficha-trauma.json';

const trauma = fichaTrauma as unknown as Ficha;
const neuro = fichaNeuro as unknown as Ficha;
const adultoMayor = fichaAdultoMayor as unknown as Ficha;

describe('ficha-formulario (SPEC C §7–§8)', () => {
  it('crea un control por clave editable; los datos de solo lectura no tienen control', () => {
    const { controles } = estructuraDe(trauma);
    expect(controles.get('s2.mecanismo')).toBe('lista');
    expect(controles.get('s6.6_1_inspeccion.otro')).toBe('texto');
    expect(controles.get('s3.dolor_nrs_0_10.actual')).toBe('texto');
    expect(controles.has('s1.paciente')).toBe(false);
    expect(controles.has('s1.fisioterapeuta')).toBe(false);
  });

  it('RF-C10: el puntaje de las escalas depende de su casilla "Aplicada"', () => {
    const { controles, dependencias } = estructuraDe(neuro);
    expect(controles.get('s14.banco_amplio_de_escalas.f1.c1')).toBe('casilla');
    expect(dependencias.get('s14.banco_amplio_de_escalas.f1.c5')).toBe(
      's14.banco_amplio_de_escalas.f1.c1',
    );
    expect(dependencias.get('s14.banco_amplio_de_escalas.f24.c5.p2')).toBe(
      's14.banco_amplio_de_escalas.f24.c1',
    );
  });

  it('RF-C08: conoce los IMC de la tabla de Traumatología y del campo de Adulto mayor', () => {
    expect([...estructuraDe(trauma).imc]).toEqual([
      [
        's5.signos_vitales_y_antropometria.f6.c2.imc',
        [
          's5.signos_vitales_y_antropometria.f6.c2.p1',
          's5.signos_vitales_y_antropometria.f6.c2.p2',
        ],
      ],
    ]);
    expect(estructuraDe(adultoMayor).imc.get('s4.imc')).toEqual(['s4.peso', 's4.estatura']);
  });

  it('carga el contenido guardado y devuelve solo lo no vacío', () => {
    const grupo = construirGrupo(estructuraDe(trauma), {
      's2.fase': 'Aguda',
      's2.mecanismo': ['Caída'],
    });
    expect(grupo.controls['s2.fase']!.value).toBe('Aguda');
    expect(grupo.controls['s1.medico_tratante']!.value).toBe('');
    grupo.controls['s1.medico_tratante']!.setValue('  Dr. Mendoza ');
    expect(contenidoDe(grupo)).toEqual({
      's2.fase': 'Aguda',
      's2.mecanismo': ['Caída'],
      's1.medico_tratante': 'Dr. Mendoza',
    });
  });

  it('calcula el IMC con coma decimal y lo deja vacío sin datos válidos', () => {
    expect(calcularImc('78', '176')).toBe('25,2');
    expect(calcularImc('78,5', '176')).toBe('25,3');
    expect(calcularImc('', '176')).toBe('');
    expect(calcularImc('abc', '176')).toBe('');
  });

  it('SPEC C §11: en lectura los vacíos son una raya y las fechas van en dd/mm/aaaa', () => {
    expect(textoDe(undefined)).toBe('—');
    expect(textoDe('')).toBe('—');
    expect(textoDe(false)).toBe('—');
    expect(textoDe([])).toBe('—');
    expect(textoDe(true)).toBe('Sí');
    expect(textoDe(['Dolor', 'Edema'])).toBe('Dolor, Edema');
    expect(textoDe('2026-08-24')).toBe('24/08/2026');
    expect(textoDe('Subaguda')).toBe('Subaguda');
  });
});
