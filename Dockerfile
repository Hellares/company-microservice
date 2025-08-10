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
# Etapa de construcción
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Limpiar cache de npm y instalar dependencias
RUN npm cache clean --force && \
    npm install --production=false --silent

# Copiar prisma schema
COPY prisma ./prisma/

# Generar cliente Prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Compilar aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción de forma más robusta
RUN npm cache clean --force && \
    npm install --only=production --silent --no-audit --no-fund || \
    npm install --only=production

# Copiar artefactos compilados desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Crear directorio para logs
RUN mkdir -p logs && chmod -R 777 logs

# Exponer puerto
EXPOSE 3002

# Comando de inicio
CMD ["node", "dist/main"]