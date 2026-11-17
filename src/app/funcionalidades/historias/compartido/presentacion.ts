import type {
  EstadoHistoria,
  HistoriaResumen,
  TipoHistoria,
} from '../../../core/historias/historias.model';

export interface InfoTipo {
  nombre: string;
  iniciales: string;
  /** Clase CSS del color del tipo (punto e icono). */
  clase: string;
  descripcion: string;
  nota?: string;
}

// Textos y colores del prototipo B (B01, B06).
export const TIPOS: Record<TipoHistoria, InfoTipo> = {
  NEURO_ADULTO: {
    nombre: 'Neurología del adulto',
    iniciales: 'NA',
    clase: 'tipo-neuro',
    descripcion:
      'Identificación y fuente de información, sexo, dominancia, ocupación, nivel educativo, teléfono y un cuidador o contacto.',
  },
  TRAUMA_ADULTO: {
    nombre: 'Traumatología del adulto',
    iniciales: 'TA',
    clase: 'tipo-trauma',
    descripcion:
      'Identificación, sexo, dominancia, ocupación o deporte, demandas físicas, teléfono y un contacto de emergencia.',
  },
  REHAB_INFANTIL: {
    nombre: 'Rehabilitación infantil',
    iniciales: 'RI',
    clase: 'tipo-infantil',
    descripcion:
      'Primero el representante, luego los datos del niño o niña, la dirección y un contacto (teléfono y correo).',
    nota: 'Requiere un representante para iniciar la valoración',
  },
  ADULTO_MAYOR: {
    nombre: 'Adulto mayor',
    iniciales: 'AM',
    clase: 'tipo-adulto-mayor',
    descripcion:
      'Identificación, estado civil, lugar de nacimiento, instrucción, dirección de residencia y un familiar de contacto.',
  },
};

/** Orden de las tarjetas en "Crear nueva historia" (B06). */
export const ORDEN_TIPOS: readonly TipoHistoria[] = [
  'NEURO_ADULTO',
  'TRAUMA_ADULTO',
  'REHAB_INFANTIL',
  'ADULTO_MAYOR',
];

export function esTipoValido(valor: string | null): valor is TipoHistoria {
  return valor !== null && valor in TIPOS;
}

export function etiquetaEstado(estado: EstadoHistoria, archivada: boolean): string {
  if (archivada) return 'Archivada';
  return estado === 'BORRADOR' ? 'Borrador' : 'Activa';
}

/** `V-15.482.301`; en infantil puede ser "Sin documento" o quedar sin nacionalidad. */
export function formatearDocumento(
  h: Pick<HistoriaResumen, 'nacionalidad' | 'cedula' | 'sinDocumento'>,
): string {
  if (h.sinDocumento || !h.cedula) return 'Sin documento';
  const miles = h.cedula.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return h.nacionalidad ? `${h.nacionalidad}-${miles}` : miles;
}

/** `AAAA-MM-DD` → `dd/mm/aaaa`. */
export function formatearFecha(iso: string | null): string {
  if (!iso) return '';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/** SPEC §16: la edad no se guarda; se calcula al mostrarla. */
export function calcularEdad(fechaNacimiento: string | null, hoy: Date): string {
  if (!fechaNacimiento) return '';
  const [anio, mes, dia] = fechaNacimiento.split('-').map(Number);
  let edad = hoy.getFullYear() - anio!;
  const mesActual = hoy.getMonth() + 1;
  if (mesActual < mes! || (mesActual === mes && hoy.getDate() < dia!)) edad--;
  if (edad < 0) return '';
  return `${edad} ${edad === 1 ? 'año' : 'años'}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Hoy 08:40", "Ayer 17:30" o "09/11/2026" (listado B01). */
export function formatearMomento(iso: string, ahora: Date): string {
  const fecha = new Date(iso);
  const hora = `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
  if (mismoDia(fecha, ahora)) return `Hoy ${hora}`;
  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  if (mismoDia(fecha, ayer)) return `Ayer ${hora}`;
  return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
}

/** "hoy 08:12" en minúscula, para frases como "Creada hoy 08:12" (B20). */
export function formatearMomentoEnFrase(iso: string, ahora: Date): string {
  const texto = formatearMomento(iso, ahora);
  return texto.startsWith('Hoy') || texto.startsWith('Ayer')
    ? texto.charAt(0).toLowerCase() + texto.slice(1)
    : texto;
}

export function iniciales(nombre: string, apellido: string): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
}
