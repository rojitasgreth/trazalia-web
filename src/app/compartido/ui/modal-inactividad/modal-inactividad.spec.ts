import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalInactividad } from './modal-inactividad';

describe('ModalInactividad', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModalInactividad],
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('no renderiza nada cuando no es visible', async () => {
    const fixture = TestBed.createComponent(ModalInactividad);
    fixture.componentRef.setInput('visible', false);
    fixture.componentRef.setInput('segundosRestantes', 0);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('muestra el diálogo con el tiempo restante formateado', async () => {
    const fixture = TestBed.createComponent(ModalInactividad);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('segundosRestantes', 125);
    await fixture.whenStable();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('2:05');
  });

  it('emite continuar y cerrar al pulsar cada botón', async () => {
    const fixture = TestBed.createComponent(ModalInactividad);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('segundosRestantes', 60);
    const continuar = vi.fn();
    const cerrar = vi.fn();
    fixture.componentInstance.continuar.subscribe(continuar);
    fixture.componentInstance.cerrar.subscribe(cerrar);
    await fixture.whenStable();

    const botones = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (botones[0] as HTMLButtonElement).click();
    (botones[1] as HTMLButtonElement).click();

    expect(cerrar).toHaveBeenCalledOnce();
    expect(continuar).toHaveBeenCalledOnce();
  });
});
