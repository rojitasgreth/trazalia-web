import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnlaceInvalido } from './enlace-invalido';

describe('EnlaceInvalido', () => {
  it('muestra ambas explicaciones y los enlaces de salida', async () => {
    TestBed.configureTestingModule({
      imports: [EnlaceInvalido],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(EnlaceInvalido);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Este enlace ya no funciona');
    expect(texto).toContain('¿Era una invitación?');
    expect(texto).toContain('¿Era para recuperar tu contraseña?');
    expect(fixture.nativeElement.querySelector('a[href="/recuperar"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/iniciar-sesion"]')).not.toBeNull();
  });
});
