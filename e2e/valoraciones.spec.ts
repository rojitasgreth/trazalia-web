import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const FISIO = {
  idUsuario: 'f1',
  correo: 'daniela@b.com',
  nombreUsuario: 'V1',
  nombre: 'Daniela',
  apellido: 'Ortega',
  rol: 'FISIOTERAPEUTA',
};

const ID = '6f1c0b44-0000-4000-8000-000000000001';
const RUTA = `**/api/v1/historias/${ID}/valoracion`;
const FICHA = JSON.parse(
  readFileSync(
    join(__dirname, '../src/app/funcionalidades/valoraciones/pruebas/ficha-trauma.json'),
    'utf8',
  ),
) as { secciones: unknown[] };

const DATOS = {
  nombre: 'Carlos Andrade',
  documento: 'V-15.482.301',
  fechaNacimiento: '14/03/1985',
  edad: '41 años',
  sexo: 'Masculino',
  dominancia: 'Diestro(a)',
  ocupacion: 'Contador',
  demandasFisicas: 'Oficina',
  telefono: '04125550134',
  contacto: 'Patricia Andrade · Esposa · 04145552290',
};

function respuesta(valoracion: object | null, estado = 'BORRADOR') {
  return {
    historia: {
      idHistoria: ID,
      tipo: 'TRAUMA_ADULTO',
      estado,
      archivada: false,
      nombre: 'Carlos',
      apellido: 'Andrade',
      puedeIniciarValoracion: true,
      camposFaltantes: [],
    },
    valoracion,
    ficha: FICHA,
    datos: DATOS,
  };
}

const EN_CURSO = {
  idValoracion: 'v1',
  estado: 'EN_CURSO',
  versionFicha: 1,
  version: 1,
  contenido: { 's11.paciente_representante_nombre': 'Carlos Andrade' },
  nombreFisioterapeuta: 'Daniela Ortega',
  fechaInicio: '2026-11-19T13:00:00.000Z',
  fechaFinalizacion: null,
};

async function iniciarSesion(page: Page) {
  await page.route('**/api/v1/autenticacion/yo', (r) => r.fulfill({ json: { usuario: FISIO } }));
  await page.route('**/api/v1/salud', (r) =>
    r.fulfill({ json: { estado: 'ok', baseDeDatos: 'ok' } }),
  );
  await page.route('**/api/v1/autenticacion/actividad', (r) =>
    r.fulfill({ json: { estado: 'ok' } }),
  );
}

test('SPEC C: inicia desde el detalle, guarda al cambiar de pestaña y finaliza', async ({
  page,
}) => {
  await iniciarSesion(page);
  const detalle = {
    idHistoria: ID,
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
    datos: {
      nombre: 'Carlos',
      apellido: 'Andrade',
      nacionalidad: 'V',
      cedula: '15482301',
      sinDocumento: false,
      fechaNacimiento: '1985-03-14',
      fuenteInformacion: [],
      modalidad: 'DOMICILIO',
      idCentro: null,
    },
    representante: null,
    datosInfantiles: null,
    camposFaltantes: [],
    puedeIniciarValoracion: true,
    tieneRegistrosClinicos: false,
    centro: null,
    otrasHistorias: [],
  };
  await page.route(`**/api/v1/historias/${ID}`, (r) => r.fulfill({ json: { historia: detalle } }));

  const guardados: unknown[] = [];
  let actual: object = respuesta(EN_CURSO);
  await page.route(RUTA, async (r) => {
    const metodo = r.request().method();
    if (metodo === 'POST') return r.fulfill({ status: 201, json: respuesta(EN_CURSO) });
    if (metodo === 'PUT') {
      const cuerpo = r.request().postDataJSON() as { contenido: object; version: number };
      guardados.push(cuerpo);
      actual = respuesta({ ...EN_CURSO, version: cuerpo.version + 1, contenido: cuerpo.contenido });
      return r.fulfill({ json: actual });
    }
    return r.fulfill({ json: actual });
  });
  let finalizado: unknown;
  await page.route(`${RUTA}/finalizar`, (r) => {
    finalizado = r.request().postDataJSON();
    return r.fulfill({
      json: respuesta(
        {
          ...EN_CURSO,
          ...(actual as { valoracion: object }).valoracion,
          estado: 'FINALIZADA',
          fechaFinalizacion: '2026-11-19T14:45:00.000Z',
        },
        'ACTIVA',
      ),
    });
  });

  await page.goto(`/historias/${ID}`);
  await page.getByRole('button', { name: 'Iniciar valoración' }).click();
  await expect(page).toHaveURL(new RegExp(`/historias/${ID}/valoracion$`));
  await expect(page.getByRole('heading', { name: 'Valoración', exact: true })).toBeVisible();
  await expect(page.getByRole('tab')).toHaveCount(11);
  await expect(page.getByText('Daniela Ortega').first()).toBeVisible();

  await page.getByLabel('Médico tratante').fill('Dr. Mendoza');
  await page.getByRole('button', { name: /Siguiente: 2\. Diagnóstico/ }).click();
  await expect(
    page.getByRole('heading', { name: '2. Diagnóstico, mecanismo y antecedentes' }),
  ).toBeVisible();
  await expect(page.getByText('Borrador de la valoración guardado hoy')).toBeVisible();
  expect(guardados).toEqual([
    {
      contenido: {
        's11.paciente_representante_nombre': 'Carlos Andrade',
        's1.medico_tratante': 'Dr. Mendoza',
      },
      version: 1,
    },
  ]);

  await page.getByText('Subaguda', { exact: true }).click();
  await page.getByRole('tab', { name: /Signos vitales/ }).click();
  await page.getByRole('textbox', { name: /Reposo: Peso\/talla\/IMC · Peso/ }).fill('78');
  await page.getByRole('textbox', { name: /Reposo: Peso\/talla\/IMC · Talla/ }).fill('176');
  await expect(page.getByRole('textbox', { name: /Reposo: Peso\/talla\/IMC · IMC/ })).toHaveValue(
    '25,2',
  );

  await page.getByRole('button', { name: 'Finalizar valoración' }).click();
  const dialogo = page.getByRole('dialog', { name: '¿Finalizar la valoración?' });
  await expect(dialogo).toContainText('Borrador → Activa');
  await dialogo.getByRole('button', { name: 'Finalizar valoración' }).click();

  await expect(page.getByText('Finalizada · solo lectura')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Imprimir para firmas' })).toBeVisible();
  // Cada guardado sube la versión; la finalización usa la última.
  expect(guardados).toHaveLength(3);
  expect(finalizado).toEqual({ version: 4 });
  expect((guardados.at(-1) as { contenido: Record<string, string> }).contenido).toMatchObject({
    's2.fase': 'Subaguda',
    's5.signos_vitales_y_antropometria.f6.c2.imc': '25,2',
  });
});
