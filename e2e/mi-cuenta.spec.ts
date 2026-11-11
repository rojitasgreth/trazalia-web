import { expect, test } from '@playwright/test';

const FISIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA',
};

async function iniciarSesionComo(page: import('@playwright/test').Page, usuario: typeof FISIO) {
  await page.route('**/api/v1/autenticacion/yo', (ruta) => ruta.fulfill({ json: { usuario } }));
  await page.route('**/api/v1/salud', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );
  await page.route('**/api/v1/autenticacion/actividad', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );
}

test('cualquier usuario ve el enlace de Mi cuenta, su perfil y sus sesiones', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await page.route('**/api/v1/autenticacion/sesiones', (ruta) =>
    ruta.fulfill({
      json: {
        data: [
          {
            idSesion: 's1',
            etiquetaDispositivo: 'Chrome en Windows',
            fechaCreacion: '2026-01-01T00:00:00Z',
            ultimaActividad: '2026-01-01T00:00:00Z',
          },
        ],
      },
    }),
  );

  await page.goto('/');
  await page.getByRole('link', { name: 'Mi cuenta' }).click();

  await expect(page).toHaveURL(/\/mi-cuenta$/);
  await expect(page.getByText('ana@b.com')).toBeVisible();
  await expect(page.getByText('Chrome en Windows')).toBeVisible();
});

test('enviarme el enlace llama a recuperar contraseña con el correo propio', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await page.route('**/api/v1/autenticacion/sesiones', (ruta) =>
    ruta.fulfill({ json: { data: [] } }),
  );
  let cuerpoRecibido: unknown;
  await page.route('**/api/v1/autenticacion/contrasena/recuperar', (ruta) => {
    cuerpoRecibido = ruta.request().postDataJSON();
    ruta.fulfill({ json: { estado: 'ok' } });
  });

  await page.goto('/mi-cuenta');
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();

  await expect(
    page.getByText('Si la cuenta existe, se envió un enlace a tu correo.'),
  ).toBeVisible();
  expect(cuerpoRecibido).toEqual({ correo: 'ana@b.com' });
});

test('cerrar sesión en todos los dispositivos devuelve a iniciar sesión', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await page.route('**/api/v1/autenticacion/sesiones', (ruta) =>
    ruta.fulfill({ json: { data: [] } }),
  );
  await page.route('**/api/v1/autenticacion/cerrar-sesiones', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );

  await page.goto('/mi-cuenta');
  await page.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }).click();

  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});
