import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { PaginaElegirTipo } from './pagina-elegir-tipo';

describe('PaginaElegirTipo', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PaginaElegirTipo],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('B06/RF-002: muestra los cuatro tipos y continúa al formulario del elegido', async () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(PaginaElegirTipo);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    const radios = elemento.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(radios).toHaveLength(4);
    expect(elemento.textContent).toContain('Adulto mayor');
    const continuar = elemento.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(continuar.disabled).toBe(true);

    radios[1]!.click();
    await fixture.whenStable();
    elemento.querySelector('form')!.dispatchEvent(new Event('submit'));

    expect(router.navigate).toHaveBeenCalledWith(['/historias/nueva', 'TRAUMA_ADULTO']);
  });

  it('Rehabilitación infantil queda deshabilitada hasta el corte 2', async () => {
    const fixture = TestBed.createComponent(PaginaElegirTipo);
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;

    const infantil = elemento.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2]!;
    expect(infantil.value).toBe('REHAB_INFANTIL');
    expect(infantil.disabled).toBe(true);
    expect(elemento.textContent).toContain('Disponible próximamente');
  });
});
