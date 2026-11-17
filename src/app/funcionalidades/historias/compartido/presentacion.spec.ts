import {
  calcularEdad,
  esTipoValido,
  etiquetaEstado,
  formatearDocumento,
  formatearFecha,
  formatearMomento,
  formatearMomentoEnFrase,
  iniciales,
} from './presentacion';

const AHORA = new Date(2026, 10, 16, 10, 0);

describe('presentación de historias', () => {
  it('formatea el documento con nacionalidad y separador de miles', () => {
    expect(formatearDocumento({ nacionalidad: 'V', cedula: '15482301', sinDocumento: false })).toBe(
      'V-15.482.301',
    );
    expect(formatearDocumento({ nacionalidad: 'E', cedula: '3215774', sinDocumento: false })).toBe(
      'E-3.215.774',
    );
    // Infantil: nacionalidad pendiente o sin documento.
    expect(formatearDocumento({ nacionalidad: null, cedula: '123', sinDocumento: false })).toBe(
      '123',
    );
    expect(formatearDocumento({ nacionalidad: null, cedula: null, sinDocumento: true })).toBe(
      'Sin documento',
    );
  });

  it('formatea fechas ISO como dd/mm/aaaa', () => {
    expect(formatearFecha('1985-03-14')).toBe('14/03/1985');
    expect(formatearFecha('2026-11-16T12:00:00.000Z')).toBe('16/11/2026');
    expect(formatearFecha(null)).toBe('');
  });

  it('calcula la edad cumplida a la fecha de hoy (§16)', () => {
    expect(calcularEdad('1985-03-14', AHORA)).toBe('41 años');
    expect(calcularEdad('1985-11-17', AHORA)).toBe('40 años');
    expect(calcularEdad('2025-11-16', AHORA)).toBe('1 año');
    expect(calcularEdad(null, AHORA)).toBe('');
    expect(calcularEdad('2030-01-01', AHORA)).toBe('');
  });

  it('muestra momentos relativos como en el listado (Hoy/Ayer/fecha)', () => {
    expect(formatearMomento(new Date(2026, 10, 16, 8, 40).toISOString(), AHORA)).toBe('Hoy 08:40');
    expect(formatearMomento(new Date(2026, 10, 15, 17, 30).toISOString(), AHORA)).toBe(
      'Ayer 17:30',
    );
    expect(formatearMomento(new Date(2026, 10, 9, 9, 0).toISOString(), AHORA)).toBe('09/11/2026');
    expect(formatearMomentoEnFrase(new Date(2026, 10, 16, 8, 12).toISOString(), AHORA)).toBe(
      'hoy 08:12',
    );
    expect(formatearMomentoEnFrase(new Date(2026, 9, 1).toISOString(), AHORA)).toBe('01/10/2026');
  });

  it('etiqueta el estado, con Archivada por encima de Borrador/Activa', () => {
    expect(etiquetaEstado('BORRADOR', false)).toBe('Borrador');
    expect(etiquetaEstado('ACTIVA', false)).toBe('Activa');
    expect(etiquetaEstado('ACTIVA', true)).toBe('Archivada');
  });

  it('obtiene iniciales y valida tipos', () => {
    expect(iniciales('Carlos', 'Andrade')).toBe('CA');
    expect(esTipoValido('NEURO_ADULTO')).toBe(true);
    expect(esTipoValido('OTRO')).toBe(false);
    expect(esTipoValido(null)).toBe(false);
  });
});
