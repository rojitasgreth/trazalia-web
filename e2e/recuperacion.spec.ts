import { expect, test } from '@playwright/test';

test('recuperar: envía el correo y muestra "Revisa tu correo"', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/contrasena/recuperar', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );

  await page.goto('/recuperar');
  await page.getByLabel('Correo electrónico').fill('ana@b.com');
  await page.getByRole('button', { name: 'Enviar enlace' }).click();

  await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
});

test('restablecer: crea la contraseña y muestra la confirmación', async ({ page }) => {
  await page.route('**/api/v1/autenticacion/contrasena/restablecer', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );

  await page.goto('/restablecer-contrasena?token=token-valido');
  await page.getByLabel('Contraseña nueva').fill('una-contraseña-nueva');
  await page.getByLabel('Repite la contraseña').fill('una-contraseña-nueva');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();

  await expect(page.getByRole('heading', { name: 'Contraseña actualizada' })).toBeVisible();
});

test('restablecer: un token vencido o usado muestra la pantalla de enlace inválido', async ({
  page,
}) => {
  await page.route('**/api/v1/autenticacion/contrasena/restablecer', (ruta) =>
    ruta.fulfill({ status: 400, json: { message: 'El enlace venció.' } }),
  );

  await page.goto('/restablecer-contrasena?token=token-vencido');
  await page.getByLabel('Contraseña nueva').fill('una-contraseña-nueva');
  await page.getByLabel('Repite la contraseña').fill('una-contraseña-nueva');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();

  await expect(page.getByRole('heading', { name: 'Este enlace ya no funciona' })).toBeVisible();
});

test('restablecer: sin token en la URL muestra directamente el enlace inválido', async ({
  page,
}) => {
  await page.goto('/restablecer-contrasena');

  await expect(page.getByRole('heading', { name: 'Este enlace ya no funciona' })).toBeVisible();
});

test('login: un bloqueo por intentos (423) muestra un aviso distinto al de credenciales inválidas', async ({
  page,
}) => {
  await page.route('**/api/v1/autenticacion/iniciar-sesion', (ruta) =>
    ruta.fulfill({
      status: 423,
      json: {
        message:
          'Por seguridad, el acceso está pausado. Inténtalo de nuevo más tarde o recupera tu contraseña.',
      },
    }),
  );

  await page.goto('/iniciar-sesion');
  await page.getByLabel('Correo o nombre de usuario').fill('ana@b.com');
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('alert')).toContainText('Por seguridad, el acceso está pausado');
  await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
});
