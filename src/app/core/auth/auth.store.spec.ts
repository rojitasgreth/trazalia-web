import { AuthStore } from './auth.store';

const USUARIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA' as const,
};

describe('AuthStore', () => {
  it('empieza inicializando y sin usuario', () => {
    const store = new AuthStore();

    expect(store.estaInicializando()).toBe(true);
    expect(store.estaAutenticado()).toBe(false);
    expect(store.usuarioActual()).toBeNull();
  });

  it('establecer fija el usuario y termina la inicialización', () => {
    const store = new AuthStore();

    store.establecer(USUARIO);

    expect(store.estaAutenticado()).toBe(true);
    expect(store.usuarioActual()).toEqual(USUARIO);
    expect(store.estaInicializando()).toBe(false);
  });

  it('limpiar quita el usuario y termina la inicialización', () => {
    const store = new AuthStore();
    store.establecer(USUARIO);

    store.limpiar();

    expect(store.estaAutenticado()).toBe(false);
    expect(store.usuarioActual()).toBeNull();
    expect(store.estaInicializando()).toBe(false);
  });
});
