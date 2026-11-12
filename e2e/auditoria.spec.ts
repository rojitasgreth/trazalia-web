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
  await page.route('**/api/v1/autenticacion/actividad', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );
}

test('un administrador ve el enlace de Auditoría y consulta la bitácora con filtros', async ({
  page,
}) => {
  await iniciarSesionComo(page, ADMIN);
  await page.route('**/api/v1/auditoria/eventos?*', (ruta) => {
    const url = new URL(ruta.request().url());
    ruta.fulfill({
      json: {
        datos: [
          {
            idEvento: 'e1',
            idUsuarioActor: 'admin-1',
            idUsuarioAfectado: null,
            tipoEvento: url.searchParams.get('tipoEvento') ?? 'inicio_sesion',
            resultado: 'EXITOSO',
            metadatosMinimos: null,
            fechaEvento: '2026-01-01T00:00:00Z',
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 20,
      },
    });
  });

  await page.goto('/');
  await page.getByRole('link', { name: 'Auditoría' }).click();

  await expect(page).toHaveURL(/\/auditoria$/);
  await expect(page.getByRole('cell', { name: 'inicio_sesion' })).toBeVisible();

  await page.getByLabel('Evento').fill('cierre_sesion');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page.getByRole('cell', { name: 'cierre_sesion' })).toBeVisible();
});

test('un fisioterapeuta no ve el enlace de Auditoría y es redirigido si entra por URL', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Auditoría' })).toHaveCount(0);

  await page.goto('/auditoria');
  await expect(page).toHaveURL(/\/$/);
});
