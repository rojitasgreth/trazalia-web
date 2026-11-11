import { type AbstractControl, type ValidationErrors } from '@angular/forms';

export function sinEspacios(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && /\s/.test(control.value)
    ? { sinEspacios: true }
    : null;
}

export function contrasenasCoinciden(control: AbstractControl): ValidationErrors | null {
  const contrasena = control.get('contrasena')?.value;
  const confirmar = control.get('confirmarContrasena')?.value;
  return contrasena && confirmar && contrasena !== confirmar ? { noCoinciden: true } : null;
}
