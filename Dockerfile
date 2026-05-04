# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build --configuration production

FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache gettext

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint/40-envsubst-on-template.sh /docker-entrypoint.d/40-envsubst-on-template.sh
RUN chmod +x /docker-entrypoint.d/40-envsubst-on-template.sh

# Angular application build output
COPY --from=build /app/www/browser/ /usr/share/nginx/html/
# Runtime template for environment overrides
COPY docker/runtime-config/env.template.js /usr/share/nginx/html/assets/env.template.js

EXPOSE 80
