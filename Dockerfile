FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias incluyendo las de desarrollo (necesarias para compilar)
RUN npm ci || npm install

# Generar los clientes de Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Compilar la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production || npm install --only=production

# Copiar el código compilado y los artefactos de Prisma desde la etapa de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Crear directorio para logs
RUN mkdir -p logs && chmod -R 777 logs

# Exponer puerto (aunque es un microservicio RabbitMQ, esto es por claridad)
EXPOSE 3002

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]