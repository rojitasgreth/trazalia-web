# syntax=docker/dockerfile:1
# Imagen de producción: archivos estáticos de Angular servidos por nginx.
# La API (/api) la enruta el proxy inverso del servidor, en el mismo dominio (DP-08).

FROM node:26-bookworm-slim AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construccion /app/dist/trazalia-web/browser /usr/share/nginx/html
EXPOSE 8080
