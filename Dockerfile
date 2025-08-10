# FROM node:18-alpine AS builder

# WORKDIR /app

# # Copiar archivos de dependencias
# COPY package*.json ./

# # Instalar dependencias incluyendo las de desarrollo (necesarias para compilar)
# RUN npm ci || npm install

# # Generar los clientes de Prisma
# COPY prisma ./prisma/
# RUN npx prisma generate

# # Copiar el resto del código fuente
# COPY . .

# # Compilar la aplicación
# RUN npm run build

# # Etapa de producción
# FROM node:18-alpine AS production

# WORKDIR /app

# # Copiar archivos de dependencias
# COPY package*.json ./

# # Instalar solo dependencias de producción
# RUN npm ci --only=production || npm install --only=production

# # Copiar el código compilado y los artefactos de Prisma desde la etapa de build
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# COPY --from=builder /app/prisma ./prisma

# # Crear directorio para logs
# RUN mkdir -p logs && chmod -R 777 logs

# # Exponer puerto (aunque es un microservicio RabbitMQ, esto es por claridad)
# EXPOSE 3002

# # Comando para iniciar la aplicación
# CMD ["node", "dist/main"]

# Etapa de construcción
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache wget

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --silent

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Compilar aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

# Instalar wget para healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production --silent && npm cache clean --force

# Copiar artefactos desde builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Crear directorio para logs
RUN mkdir -p logs && chown -R nestjs:nodejs logs

# Cambiar a usuario no-root
USER nestjs

# Exponer puerto
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Comando de inicio
CMD ["node", "dist/main"]