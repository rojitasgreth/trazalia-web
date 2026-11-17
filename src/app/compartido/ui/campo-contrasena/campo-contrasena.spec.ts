import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CampoContrasena } from './campo-contrasena';

@Component({
  imports: [CampoContrasena],
  template: `
    <app-campo-contrasena>
      <input #campo id="clave" type="password" value="secreta-123" />
    </app-campo-contrasena>
  `,
})
class Anfitrion {}

describe('CampoContrasena', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Anfitrion],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('muestra y oculta la contraseña con el botón del ojo', async () => {
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    const input = elemento.querySelector<HTMLInputElement>('#clave')!;
    const boton = elemento.querySelector<HTMLButtonElement>('button')!;

    expect(input.type).toBe('password');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('false');
    expect(boton.getAttribute('aria-controls')).toBe('clave');
    expect(boton.type).toBe('button');

    boton.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(input.value).toBe('secreta-123');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    boton.click();
    await fixture.whenStable();
    expect(input.type).toBe('password');
  });
});
