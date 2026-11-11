import { expect, test } from '@playwright/test';

const ADMIN = {
  idUsuario: 'admin-1',
  correo: 'admin@b.com',
  nombreUsuario: 'V0',
  nombre: 'Admin',
  apellido: 'Uno',
  rol: 'ADMINISTRADOR',
};

const FISIO = { ...ADMIN, idUsuario: 'u1', rol: 'FISIOTERAPEUTA' };

async function iniciarSesionComo(page: import('@playwright/test').Page, usuario: typeof ADMIN) {
  await page.route('**/api/v1/autenticacion/yo', (ruta) => ruta.fulfill({ json: { usuario } }));
  await page.route('**/api/v1/salud', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );
  // Cualquier clic dentro del Shell dispara la señal de actividad (BR-036).
  await page.route('**/api/v1/autenticacion/actividad', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );
}

test('un administrador ve el enlace de Usuarios y puede ver el listado', async ({ page }) => {
  await iniciarSesionComo(page, ADMIN);
  await page.route('**/api/v1/usuarios?*', (ruta) =>
    ruta.fulfill({
      json: {
        datos: [
          {
            idUsuario: 'u2',
            nacionalidad: 'V',
            cedula: '2',
            nombre: 'Ana',
            apellido: 'Pérez',
            correo: 'ana@b.com',
            telefono: null,
            nombreUsuario: 'V2',
            rol: 'FISIOTERAPEUTA',
            estado: 'ACTIVO',
            fechaCreacion: '2026-01-01T00:00:00Z',
            fechaActivacion: '2026-01-01T00:00:00Z',
            ultimoAcceso: null,
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 20,
      },
    }),
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Usuarios' }).click();

  await expect(page).toHaveURL(/\/usuarios$/);
  await expect(page.getByRole('link', { name: 'Ana Pérez' })).toBeVisible();
  await expect(page.getByRole('link', { name: '+ Nuevo usuario' })).toBeVisible();
});

test('un fisioterapeuta no ve el enlace de Usuarios y es redirigido si entra por URL', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0);

  await page.goto('/usuarios');
  await expect(page).toHaveURL(/\/$/);
});

test('activar-cuenta: crea la contraseña y lleva a iniciar sesión', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/invitaciones/aceptar', (ruta) =>
    ruta.fulfill({ json: { estado: 'activada' } }),
  );

  await page.goto('/activar-cuenta?token=token-valido');
  await page.getByLabel('Contraseña', { exact: true }).fill('una-contraseña-nueva');
  await page.getByLabel('Confirmar contraseña').fill('una-contraseña-nueva');
  await page.getByRole('button', { name: 'Activar cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Cuenta activada' })).toBeVisible();
});

test('activar-cuenta: sin token en la URL muestra "Enlace inválido"', async ({ page }) => {
  await page.goto('/activar-cuenta');

  await expect(page.getByRole('heading', { name: 'Enlace inválido' })).toBeVisible();
});
