# trazalia-web

Frontend de Trazalia, la aplicación SaaS de gestión fisioterapéutica. Está hecho con Angular 22 (standalone y zoneless) y Angular CDK, y corre sobre Node.js 26 LTS.

Las fuentes de verdad son el **Documento Cero** y el **spec de cada módulo**, junto con el prototipo de diseño. Todo vive en `fisio/docs/docs/`, fuera de este repositorio.

## Puesta en marcha

```bash
npm ci
npm start          # http://localhost:4200, con /api redirigido a http://localhost:3000
```

Para ver datos reales, la API (`trazalia-api`) tiene que estar corriendo. Sin ella, la aplicación muestra que no hay conexión con el servidor.

## Scripts

| Script | Qué hace |
|---|---|
| `start` | Servidor de desarrollo con proxy a la API |
| `test` / `test:cov` | Pruebas unitarias con Vitest |
| `e2e` | Pruebas E2E con Playwright en escritorio y móvil (390 px) |
| `lint`, `format:check` | Calidad; las mismas verificaciones que ejecuta el CI |
| `build` | Compilación de producción en `dist/trazalia-web/browser` |

## Estructura

```
src/app/
  nucleo/            servicios singleton: acceso a la API, sesión, interceptores
  compartido/ui/     componentes reutilizables del sistema de diseño
  funcionalidades/   un directorio por funcionalidad, cargada de forma diferida
src/styles.css       tokens de diseño extraídos del prototipo
e2e/                 pruebas Playwright
```

## Seguridad

- Los tokens viajan solo en cookies `HttpOnly`. Nunca se guardan en `localStorage` ni en `sessionStorage`.
- Angular envía la cabecera `X-XSRF-TOKEN` a partir de la cookie `XSRF-TOKEN` (CSRF double-submit).
- Ocultar algo en la interfaz no equivale a autorizar: toda autorización se valida en el backend.
