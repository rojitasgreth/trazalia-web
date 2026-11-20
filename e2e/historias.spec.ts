import { expect, test, type Page } from '@playwright/test';

const FISIO = {
  idUsuario: 'f1',
  correo: 'daniela@b.com',
  nombreUsuario: 'V1',
  nombre: 'Daniela',
  apellido: 'Ortega',
  rol: 'FISIOTERAPEUTA',
};

const ADMIN = { ...FISIO, idUsuario: 'a1', rol: 'ADMINISTRADOR' };

const RESUMEN = {
  idHistoria: '6f1c0b44-0000-4000-8000-000000000001',
  tipo: 'TRAUMA_ADULTO',
  estado: 'BORRADOR',
  archivada: false,
  nombre: 'Carlos',
  apellido: 'Andrade',
  nacionalidad: 'V',
  cedula: '15482301',
  sinDocumento: false,
  telefono: '04125550134',
  fechaNacimiento: '1985-03-14',
  fechaCreacion: '2026-11-16T12:00:00.000Z',
  fechaActualizacion: '2026-11-16T12:00:00.000Z',
  fechaArchivo: null,
};

const DETALLE = {
  ...RESUMEN,
  datos: {
    nombre: 'Carlos',
    apellido: 'Andrade',
    nacionalidad: 'V',
    cedula: '15482301',
    sinDocumento: false,
    fechaNacimiento: '1985-03-14',
    sexo: 'MASCULINO',
    dominancia: null,
    ocupacion: null,
    nivelEducativo: null,
    estadoCivil: null,
    lugarNacimiento: null,
    telefono: '04125550134',
    correo: null,
    dirEstado: null,
    dirMunicipio: null,
    dirParroquia: null,
    dirComunidad: null,
    contactoNombre: null,
    contactoParentesco: null,
    contactoTelefono: null,
    demandasFisicas: null,
    fuenteInformacion: [],
    modalidad: null,
    idCentro: null,
  },
  representante: null,
  datosInfantiles: null,
  camposFaltantes: [
    'dominancia',
    'ocupacion',
    'demandasFisicas',
    'contactoNombre',
    'contactoParentesco',
    'contactoTelefono',
  ],
  puedeIniciarValoracion: false,
  tieneRegistrosClinicos: false,
  centro: null,
  otrasHistorias: [],
};

async function iniciarSesionComo(page: Page, usuario: typeof FISIO) {
  await page.route('**/api/v1/autenticacion/yo', (ruta) => ruta.fulfill({ json: { usuario } }));
  await page.route('**/api/v1/salud', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );
  await page.route('**/api/v1/autenticacion/actividad', (ruta) =>
    ruta.fulfill({ json: { estado: 'ok' } }),
  );
  // El formulario consulta coincidencias al salir de un campo (B13/B14); sin
  // simularla la petición llegaría a la API real, si hay una levantada.
  await page.route('**/api/v1/historias/coincidencias', (ruta) =>
    ruta.fulfill({ json: { resultado: 'ninguna' } }),
  );
}

async function simularListado(page: Page, datos: unknown[]) {
  await page.route('**/api/v1/historias?*', (ruta) =>
    ruta.fulfill({
      json: {
        datos,
        total: datos.length,
        pagina: 1,
        porPagina: 20,
        conteos: { historias: datos.length, archivadas: 0 },
      },
    }),
  );
}

test('AC-001: el administrador no ve Historias clínicas y es redirigido si entra por URL', async ({
  page,
}) => {
  await iniciarSesionComo(page, ADMIN);

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Historias clínicas' })).toHaveCount(0);

  await page.goto('/historias');
  await expect(page).toHaveURL(/\/$/);
});

test('el fisioterapeuta ve su listado de historias', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await simularListado(page, [RESUMEN]);

  await page.goto('/');
  await page.getByRole('link', { name: 'Historias clínicas' }).click();

  await expect(page).toHaveURL(/\/historias$/);
  await expect(page.getByRole('heading', { name: 'Historias clínicas' })).toBeVisible();
  await expect(page.getByText('V-15.482.301').filter({ visible: true }).first()).toBeVisible();
  await expect(
    page.getByText('Traumatología del adulto').filter({ visible: true }).first(),
  ).toBeVisible();
});

test('crea una historia de Traumatología en Borrador y abre su detalle', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await simularListado(page, []);
  let cuerpo: Record<string, unknown> | undefined;
  await page.route('**/api/v1/historias', async (ruta) => {
    if (ruta.request().method() !== 'POST') return ruta.fallback();
    cuerpo = ruta.request().postDataJSON() as Record<string, unknown>;
    await ruta.fulfill({ status: 201, json: { historia: DETALLE } });
  });
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: DETALLE } }),
  );

  await page.goto('/historias');
  await expect(page.getByText('Aún no tienes historias clínicas')).toBeVisible();
  await page.getByRole('link', { name: 'Crear nueva historia' }).first().click();

  await page.getByText('Traumatología del adulto', { exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva historia clínica' })).toBeVisible();

  // B12: sin datos obligatorios no se envía.
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('Faltan 3 datos para crear la historia');

  await page.locator('#nombre').fill('Carlos');
  await page.locator('#apellido').fill('Andrade');
  await expect(page.getByLabel('Nacionalidad')).toHaveValue('V');
  await page.getByLabel('Número de cédula').fill('15482301');
  await page.getByLabel('Fecha de nacimiento').fill('1985-03-14');
  await expect(page.getByLabel('Edad')).toHaveValue(/\d+ años/);
  await page.getByText('Masculino', { exact: true }).click();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  await expect(page.getByText('Historia guardada como borrador.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Carlos Andrade' })).toBeVisible();
  await expect(page.getByText('Aún no se puede iniciar. Falta completar:')).toBeVisible();
  expect(cuerpo).toMatchObject({
    tipo: 'TRAUMA_ADULTO',
    cedula: '15482301',
    nacionalidad: 'V',
    sexo: 'MASCULINO',
  });
});

test('B13: un duplicado del mismo tipo ofrece abrir la historia existente', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await page.route('**/api/v1/historias', (ruta) =>
    ruta.request().method() === 'POST'
      ? ruta.fulfill({
          status: 409,
          json: { mensaje: 'Ya existe.', idHistoriaExistente: RESUMEN.idHistoria },
        })
      : ruta.fallback(),
  );
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: { ...DETALLE, estado: 'ACTIVA' } } }),
  );

  await page.goto('/historias/nueva/TRAUMA_ADULTO');
  await page.locator('#nombre').fill('Carlos');
  await page.locator('#apellido').fill('Andrade');
  await expect(page.getByLabel('Nacionalidad')).toHaveValue('V');
  await page.getByLabel('Número de cédula').fill('15482301');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText(
    'Este paciente ya tiene una historia de Traumatología del adulto',
  );
  await dialogo.getByRole('button', { name: 'Abrir historia existente' }).click();
  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
});

test('B10: crea una historia infantil sin documento, con el representante primero', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);
  let cuerpo: Record<string, unknown> | undefined;
  const infantil = {
    ...DETALLE,
    tipo: 'REHAB_INFANTIL',
    nombre: 'Sofía',
    apellido: 'Martínez',
    nacionalidad: null,
    cedula: null,
    sinDocumento: true,
    camposFaltantes: ['representante.parentesco'],
  };
  await page.route('**/api/v1/historias', async (ruta) => {
    if (ruta.request().method() !== 'POST') return ruta.fallback();
    cuerpo = ruta.request().postDataJSON() as Record<string, unknown>;
    await ruta.fulfill({ status: 201, json: { historia: infantil } });
  });
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: infantil } }),
  );

  await page.goto('/historias/nueva/REHAB_INFANTIL');
  await expect(page.locator('.seccion h2').first()).toHaveText('Representante');
  await expect(page.getByText('Puedes guardar sin representante')).toBeVisible();

  await page.locator('#representante-parentesco').selectOption('MADRE');
  await page.locator('#representante-nombre').fill('Laura');
  await page.locator('#nombre').fill('Sofía');
  await page.locator('#apellido').fill('Martínez');
  await page.getByText('Sin documento', { exact: true }).click();
  await page.locator('#fechaNacimiento').fill('2022-06-10');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  expect(cuerpo).toMatchObject({
    tipo: 'REHAB_INFANTIL',
    sinDocumento: true,
    cedula: null,
    representante: { parentesco: 'MADRE', nombre: 'Laura' },
  });
});

test('B14/B15: autocompleta una historia de Neurología con los datos de Traumatología', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);
  await page.route('**/api/v1/historias/coincidencias', (ruta) =>
    ruta.fulfill({
      json: {
        resultado: 'autocompletar',
        historia: RESUMEN,
        datos: { ...DETALLE.datos, ocupacion: 'Contador', dominancia: 'Diestro(a)' },
      },
    }),
  );

  await page.goto('/historias/nueva/NEURO_ADULTO');
  await page.locator('#nacionalidad').selectOption('V');
  await page.locator('#cedula').fill('15482301');
  await page.locator('#cedula').blur();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Encontramos otra historia de este paciente');
  await dialogo.getByRole('button', { name: 'Usar estos datos' }).click();

  await expect(page.locator('#nombre')).toHaveValue('Carlos');
  await expect(page.locator('#ocupacion')).toHaveValue('Contador');
  await expect(
    page.getByText('Usamos los datos de su historia de Traumatología del adulto'),
  ).toBeVisible();
  // RF-013: los datos copiados siguen siendo editables.
  await page.locator('#ocupacion').fill('Contador público');
  await expect(page.locator('#ocupacion')).toHaveValue('Contador público');
});

test('B16/B17: edita el teléfono y lo aplica también a la otra historia del paciente', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);
  const conOtra = {
    ...DETALLE,
    otrasHistorias: [
      {
        idHistoria: '6f1c0b44-0000-4000-8000-000000000002',
        tipo: 'NEURO_ADULTO',
        estado: 'BORRADOR',
        archivada: false,
        sinDocumento: false,
      },
    ],
  };
  let cuerpo: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, async (ruta) => {
    if (ruta.request().method() === 'PATCH') {
      cuerpo = ruta.request().postDataJSON() as Record<string, unknown>;
    }
    await ruta.fulfill({ json: { historia: conOtra } });
  });

  await page.goto(`/historias/${RESUMEN.idHistoria}`);
  await page.getByRole('link', { name: 'Editar datos personales' }).click();
  await expect(page.getByRole('heading', { name: 'Editar datos personales' })).toBeVisible();
  await expect(page.getByText('Estás editando datos personales')).toBeVisible();

  await page.locator('#telefono').fill('04245558890');
  await expect(page.getByText('Antes: 04125550134')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('¿Actualizar también su otra historia?');
  await dialogo.getByRole('button', { name: 'Actualizar ambas' }).click();

  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  await expect(page.getByText('Cambios guardados.')).toBeVisible();
  expect(cuerpo).toMatchObject({ telefono: '04245558890', propagar: true });
});

test('B25: elimina definitivamente una historia sin registros clínicos', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await simularListado(page, []);
  let eliminada = false;
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) => {
    if (ruta.request().method() === 'DELETE') {
      eliminada = true;
      return ruta.fulfill({ status: 204 });
    }
    return ruta.fulfill({ json: { historia: DETALLE } });
  });

  await page.goto(`/historias/${RESUMEN.idHistoria}`);
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('¿Eliminar esta historia definitivamente?');
  await expect(dialogo.getByRole('button', { name: 'Eliminar definitivamente' })).toBeDisabled();
  await dialogo.getByText('Entiendo que esta acción no se puede deshacer').click();
  await dialogo.getByRole('button', { name: 'Eliminar definitivamente' }).click();

  await expect(page).toHaveURL(/\/historias$/);
  expect(eliminada).toBe(true);
});

test('B26/B27: con registros clínicos no se elimina; se archiva', async ({ page }) => {
  await iniciarSesionComo(page, FISIO);
  await simularListado(page, []);
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: { ...DETALLE, tieneRegistrosClinicos: true } } }),
  );
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}/archivar`, (ruta) =>
    ruta.fulfill({ json: { historia: { ...DETALLE, archivada: true } } }),
  );

  await page.goto(`/historias/${RESUMEN.idHistoria}`);
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Esta historia no se puede eliminar');
  await dialogo.getByRole('button', { name: 'Archivar historia' }).click();

  await expect(page).toHaveURL(/\/historias\?vista=archivadas$/);
});

const SANTA_SOFIA = {
  idCentro: '7d1c5e2a-0000-4000-8000-0000000000c1',
  nombre: 'Clínica Santa Sofía',
  estado: 'Miranda',
  municipio: 'Sucre',
  parroquia: 'Petare',
  comunidad: null,
};

async function prepararCreacion(page: Page) {
  await iniciarSesionComo(page, FISIO);
  let cuerpo: Record<string, unknown> | undefined;
  await page.route('**/api/v1/historias', async (ruta) => {
    if (ruta.request().method() !== 'POST') return ruta.fallback();
    cuerpo = ruta.request().postDataJSON() as Record<string, unknown>;
    await ruta.fulfill({ status: 201, json: { historia: DETALLE } });
  });
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: DETALLE } }),
  );
  await page.goto('/historias/nueva/NEURO_ADULTO');
  await page.locator('#nombre').fill('Carlos');
  await page.locator('#apellido').fill('Andrade');
  await page.locator('#nacionalidad').selectOption('V');
  await page.locator('#cedula').fill('15482301');
  return () => cuerpo;
}

test('v1.4 B29: atiende en un centro médico elegido en el buscador', async ({ page }) => {
  const cuerpo = await prepararCreacion(page);
  await page.route('**/api/v1/centros?*', (ruta) =>
    ruta.fulfill({ json: { datos: [SANTA_SOFIA] } }),
  );

  await page.getByText('Centro médico', { exact: true }).click();
  await page.locator('#centro').fill('santa');
  await page.getByRole('option', { name: /Clínica Santa Sofía/ }).click();
  await expect(page.getByText('Petare, Sucre, Miranda')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  expect(cuerpo()).toMatchObject({ modalidad: 'CENTRO', idCentro: SANTA_SOFIA.idCentro });
});

test('v1.4 B30/B31: registra un centro nuevo cuando no existe', async ({ page }) => {
  const cuerpo = await prepararCreacion(page);
  let nuevo: Record<string, unknown> | undefined;
  await page.route('**/api/v1/centros?*', (ruta) => ruta.fulfill({ json: { datos: [] } }));
  await page.route('**/api/v1/centros', async (ruta) => {
    nuevo = ruta.request().postDataJSON() as Record<string, unknown>;
    await ruta.fulfill({
      status: 201,
      json: { centro: { ...SANTA_SOFIA, nombre: 'Centro Médico Lara' } },
    });
  });

  await page.getByText('Centro médico', { exact: true }).click();
  await page.locator('#centro').fill('Centro Médico Lara');
  await page.getByRole('option', { name: /Agregar «Centro Médico Lara»/ }).click();

  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Nuevo centro médico');
  await expect(dialogo.locator('#centro-nombre')).toHaveValue('Centro Médico Lara');
  await dialogo.locator('#centro-estado').selectOption('Lara');
  await dialogo.locator('#centro-municipio').fill('Iribarren');
  await dialogo.locator('#centro-parroquia').fill('Catedral');
  await dialogo.getByRole('button', { name: 'Agregar centro' }).click();

  await expect(page.getByText('Centro Médico Lara')).toBeVisible();
  expect(nuevo).toMatchObject({ nombre: 'Centro Médico Lara', dirEstado: 'Lara' });
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  expect(cuerpo()).toMatchObject({ modalidad: 'CENTRO', idCentro: SANTA_SOFIA.idCentro });
});

test('v1.6: la ficha infantil sigue el orden de la ficha y envía los datos infantiles', async ({
  page,
}) => {
  await iniciarSesionComo(page, FISIO);
  let cuerpo: Record<string, unknown> | undefined;
  await page.route('**/api/v1/historias', async (ruta) => {
    if (ruta.request().method() !== 'POST') return ruta.fallback();
    cuerpo = ruta.request().postDataJSON() as Record<string, unknown>;
    await ruta.fulfill({ status: 201, json: { historia: DETALLE } });
  });
  await page.route(`**/api/v1/historias/${RESUMEN.idHistoria}`, (ruta) =>
    ruta.fulfill({ json: { historia: DETALLE } }),
  );

  await page.goto('/historias/nueva/REHAB_INFANTIL');
  await expect(page.locator('.seccion h2')).toHaveText([
    'Representante',
    'Teléfonos y correo',
    'Antecedentes maternos',
    'Niño o niña',
    'Modalidad de atención',
    'Exámenes realizados',
  ]);

  await page.locator('#representante-edad').fill('34');
  await page.locator('#dirEstado').selectOption('Lara');
  await page.locator('#nombre').fill('Sofía');
  await page.locator('#apellido').fill('Martínez');
  await page.getByText('Sin documento', { exact: true }).click();
  await page.locator('#fechaNacimiento').fill('2025-03-10');
  await page.locator('#infantil-gestas').fill('2');
  await page.locator('#infantil-edadGestacional').fill('36');
  await expect(page.locator('#infantil-edadCorregida')).not.toHaveValue('');
  await page.getByText('LM + F', { exact: true }).click();
  await page.locator('#infantil-pesquisaNeonatal').fill('Normal');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();

  await expect(page).toHaveURL(new RegExp(`/historias/${RESUMEN.idHistoria}$`));
  expect(cuerpo).toMatchObject({
    tipo: 'REHAB_INFANTIL',
    dirEstado: 'Lara',
    representante: { edad: 34 },
    datosInfantiles: {
      gestas: 2,
      edadGestacional: 36,
      alimentacion: 'LM + F',
      pesquisaNeonatal: 'Normal',
    },
  });
});
