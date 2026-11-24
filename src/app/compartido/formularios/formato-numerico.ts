import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { NgControl, type ValidatorFn } from '@angular/forms';

// Campos numéricos (decisión del 24-11-2026): solo se escribe lo que el campo
// admite y se valida con la misma regla que la API (trazalia-api,
// valoraciones/dominio/contenido.ts y los DTO de historias).

/** Cómo se escribe un valor numérico; los rangos son amplios, contra errores de tipeo. */
export type Formato =
  | { k: 'entero'; min: number; max: number }
  | { k: 'decimal'; min: number; max: number }
  /** Sistólica/diastólica, como "120/80". */
  | { k: 'presion' };

const NUMERO = /^-?(\d+([.,]\d+)?|[.,]\d+)$/;
const PRESION = /^\d{2,3}\/\d{2,3}$/;

function conComa(n: number): string {
  return String(n).replace('.', ',');
}

/** `null` es un número sin rango (como el IMC). */
export function errorDeFormato(texto: string, formato: Formato | null): string | null {
  if (formato?.k === 'presion') {
    return PRESION.test(texto) ? null : 'Escribe la presión como 120/80.';
  }
  if (!NUMERO.test(texto)) return 'Escribe solo el número, sin unidades.';
  if (!formato) return null;
  if (formato.k === 'entero' && !/^-?\d+$/.test(texto)) return 'Debe ser un número entero.';
  const valor = Number(texto.replace(',', '.'));
  return valor < formato.min || valor > formato.max
    ? `Debe estar entre ${conComa(formato.min)} y ${conComa(formato.max)}.`
    : null;
}

/** Validador de formularios reactivos con la regla de `errorDeFormato`. */
export function validadorFormato(formato: Formato): ValidatorFn {
  return (control) => {
    const texto =
      control.value === null || control.value === undefined ? '' : String(control.value);
    if (!texto.trim()) return null;
    const mensaje = errorDeFormato(texto.trim(), formato);
    return mensaje ? { formato: mensaje } : null;
  };
}

/** Texto guía del campo: el rango ("0–10") o el ejemplo de la presión. */
export function placeholderDe(formato: Formato | null): string {
  if (!formato) return 'Solo el número';
  if (formato.k === 'presion') return '120/80';
  return `${conComa(formato.min)}–${conComa(formato.max)}`;
}

/** Caracteres máximos que admite un formato (con signo y dos decimales). */
export function largoDe(formato: Formato | null): number {
  if (!formato) return 12;
  if (formato.k === 'presion') return 7;
  const digitos = (n: number) => String(Math.trunc(Math.abs(n))).length;
  const signo = formato.min < 0 ? 1 : 0;
  const enteros = Math.max(digitos(formato.min), digitos(formato.max));
  return signo + enteros + (formato.k === 'decimal' ? 3 : 0);
}

/**
 * Deja solo lo que el formato admite: dígitos, una coma decimal (el punto se
 * cambia por coma), el signo si el rango es negativo y, en la presión, la
 * barra tras la sistólica. Corta al largo máximo, también al pegar.
 */
export function limpiarNumero(texto: string, formato: Formato | null): string {
  if (formato?.k === 'presion') {
    const [antes = '', ...resto] = texto.split('/');
    const sistolica = antes.replace(/\D/g, '');
    if (resto.length > 0) {
      return `${sistolica.slice(0, 3)}/${resto.join('').replace(/\D/g, '').slice(0, 3)}`;
    }
    // Sin barra: una sistólica de 100 o más empieza por 1 o 2 ("12080" → 120/80,
    // "9060" → 90/60).
    const largo = /^[12]/.test(sistolica) ? 3 : 2;
    return sistolica.length > largo
      ? `${sistolica.slice(0, largo)}/${sistolica.slice(largo, largo + 3)}`
      : sistolica;
  }
  const signo = formato && formato.min < 0 && texto.trimStart().startsWith('-') ? '-' : '';
  let cuerpo = '';
  let decimales = -1;
  for (const caracter of texto) {
    if (/\d/.test(caracter)) {
      if (decimales >= 2) continue;
      cuerpo += caracter;
      if (decimales >= 0) decimales++;
    } else if ((caracter === ',' || caracter === '.') && decimales < 0 && formato?.k !== 'entero') {
      cuerpo += ',';
      decimales = 0;
    }
  }
  return (signo + cuerpo).slice(0, largoDe(formato));
}

/**
 * Campo numérico: teclado numérico en móvil y filtro de lo que se escribe o se
 * pega, sin mover el cursor. `undefined` deja el campo como texto libre.
 */
@Directive({
  selector: 'input[appFormato]',
  host: {
    '[attr.inputmode]': 'modo()',
    '(input)': 'filtrar()',
  },
})
export class FormatoNumerico {
  readonly appFormato = input<Formato | null | undefined>();

  private readonly elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly control = inject(NgControl, { self: true, optional: true });

  protected readonly modo = computed(() => {
    const formato = this.appFormato();
    if (formato === undefined) return null;
    // El teclado numérico del móvil no trae el signo menos.
    if (formato && formato.k !== 'presion' && formato.min < 0) return null;
    return formato?.k === 'entero' || formato?.k === 'presion' ? 'numeric' : 'decimal';
  });

  protected filtrar(): void {
    const formato = this.appFormato();
    if (formato === undefined) return;
    const elemento = this.elemento.nativeElement;
    const limpio = limpiarNumero(elemento.value, formato);
    if (limpio === elemento.value) return;
    const cursor = elemento.selectionStart ?? elemento.value.length;
    const nuevoCursor = Math.min(
      limpiarNumero(elemento.value.slice(0, cursor), formato).length,
      limpio.length,
    );
    elemento.value = limpio;
    elemento.setSelectionRange(nuevoCursor, nuevoCursor);
    this.control?.control?.setValue(limpio);
  }
}
