import { expect, test } from '@playwright/test';

const USUARIO = {
  idUsuario: 'u1',
  correo: 'ana@b.com',
  nombreUsuario: 'V1',
  nombre: 'Ana',
  apellido: 'Pérez',
  rol: 'FISIOTERAPEUTA',
};

test('una visita sin sesión se redirige a iniciar sesión', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/yo', (ruta) => ruta.fulfill({ status: 401 }));

  await page.goto('/');

  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('inicia sesión y muestra el panel con el estado del servidor', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/iniciar-sesion', (ruta) =>
    ruta.fulfill({ json: { usuario: USUARIO } }),
  );
  await page.route('**/api/v1/salud', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );

  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo o nombre de usuario').fill('ana@b.com');
  await page.getByLabel('Contraseña').fill('contraseña-válida');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Hola, Ana' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Servidor disponible.');
});

test('muestra un mensaje de error ante credenciales inválidas', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/iniciar-sesion', (ruta) =>
    ruta.fulfill({ status: 401, json: { message: 'Credenciales inválidas' } }),
  );

  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo o nombre de usuario').fill('ana@b.com');
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toHaveText('Credenciales inválidas');
});
