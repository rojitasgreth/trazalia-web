import { expect, test } from '@playwright/test';

test('muestra la marca y el servidor disponible', async ({ page }) => {
  await page.route('**/api/v1/salud', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );

  await page.goto('/');

  await expect(page).toHaveTitle('Trazalia');
  await expect(page.getByRole('heading', { name: 'Trazalia' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Servidor disponible.');
});

test('avisa cuando el servidor no responde', async ({ page }) => {
  await page.route('**/api/v1/salud', (ruta) => ruta.fulfill({ status: 503 }));

  await page.goto('/');

  await expect(page.getByRole('status')).toHaveText('No se pudo conectar con el servidor.');
});
