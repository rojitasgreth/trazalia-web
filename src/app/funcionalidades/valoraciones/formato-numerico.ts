import { computed, Directive, ElementRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import type { Formato } from '../../core/valoraciones/valoraciones.model';
import { largoDe, limpiarNumero } from './ficha-formulario';

/**
 * Campo numérico de la ficha: teclado numérico en móvil, largo máximo y
 * filtro de lo que se escribe según el formato. `undefined` deja el campo
 * como texto libre.
 */
@Directive({
  selector: 'input[appFormato]',
  host: {
    '[attr.inputmode]': 'modo()',
    '[attr.maxlength]': 'largo()',
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
  protected readonly largo = computed(() => {
    const formato = this.appFormato();
    return formato === undefined ? null : largoDe(formato);
  });

  protected filtrar(): void {
    const formato = this.appFormato();
    if (formato === undefined) return;
    const elemento = this.elemento.nativeElement;
    const limpio = limpiarNumero(elemento.value, formato);
    if (limpio === elemento.value) return;
    elemento.value = limpio;
    this.control?.control?.setValue(limpio);
  }
}
