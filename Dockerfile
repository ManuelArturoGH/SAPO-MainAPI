# Multi-stage build para NestJS
# Etapa 1: builder (instala deps, aplica parches y compila)
FROM node:22-alpine AS builder

# Necesario para compilar dependencias nativas (p.ej. bcrypt) en Alpine
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Copiar manifiestos primero para cacheo de capa de deps
COPY package*.json ./

# Instalar dependencias (incluye dev) y ejecutar postinstall (patch-package)
RUN npm ci

# Copiar fuentes y config de compilación
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

# Compilar
RUN npm run build

# Prune a dependencias de producción manteniendo parches ya aplicados
RUN npm prune --omit=dev

# Etapa 2: runner (ligera, solo runtime)
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Opcional: zona horaria
RUN apk add --no-cache tzdata

# Crear usuario no root
RUN addgroup -S nodejs && adduser -S node -G nodejs

# Copiar solo lo necesario del builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Exponer puerto por defecto de la app
EXPOSE 3000

USER node

# Variables saneadas por defecto (pueden sobreescribirse con docker-compose)
ENV HOST=0.0.0.0 \
    PORT=3000 \
    NODE_ENV=production

CMD ["node", "dist/main.js"]

