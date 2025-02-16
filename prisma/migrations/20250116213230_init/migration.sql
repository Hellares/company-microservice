-- CreateEnum
CREATE TYPE "NivelPlan" AS ENUM ('BASICO', 'ESTANDAR', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "EstadoPlan" AS ENUM ('PENDIENTE', 'ACTIVO', 'VENCIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('EN_REVISION', 'ACTIVA', 'SUSPENDIDA', 'INACTIVA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "EstadoSede" AS ENUM ('ACTIVA', 'INACTIVA', 'EN_MANTENIMIENTO', 'CERRADA_TEMPORALMENTE');

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateTable
CREATE TABLE "rubros" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icono" TEXT,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "nivelPlan" "NivelPlan" NOT NULL,
    "caracteristicas" JSONB NOT NULL,
    "limites" JSONB NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_planes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFin" TIMESTAMP(3),
    "estado" "EstadoPlan" NOT NULL DEFAULT 'ACTIVO',
    "montoPagado" DECIMAL(10,2) NOT NULL,
    "metodoPago" TEXT,
    "comprobantePago" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_planes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombreComercial" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'EN_REVISION',
    "verificada" BOOLEAN NOT NULL DEFAULT false,
    "rubroId" TEXT NOT NULL,
    "logoId" TEXT,
    "portadaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sedes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoSede" NOT NULL DEFAULT 'ACTIVA',
    "logoId" TEXT,
    "portadaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sedes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "numeroExterior" TEXT,
    "numeroInterior" TEXT,
    "referencia" TEXT,
    "codigoPostal" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'Perú',
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contactos_sede" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "telefonoPrincipal" TEXT NOT NULL,
    "telefonoSecundario" TEXT,
    "emailPrincipal" TEXT NOT NULL,
    "emailSecundario" TEXT,
    "whatsapp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contactos_sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuraciones_sede" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "colorPrimario" TEXT,
    "colorSecundario" TEXT,
    "horaApertura" TEXT,
    "horaCierre" TEXT,
    "diasOperacion" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuraciones_sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horarios_sede" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "diaSemana" "DiaSemana" NOT NULL,
    "horaApertura" TEXT NOT NULL,
    "horaCierre" TEXT NOT NULL,
    "cerrado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horarios_sede_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas_cobertura" (
    "id" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "radio" DOUBLE PRECISION NOT NULL,
    "centroLatitud" DOUBLE PRECISION NOT NULL,
    "centroLongitud" DOUBLE PRECISION NOT NULL,
    "poligono" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonas_cobertura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "informacion_legal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "regimenTributario" TEXT NOT NULL,
    "tipoContribuyente" TEXT NOT NULL,
    "fechaInicioActividades" TIMESTAMP(3) NOT NULL,
    "domicilioFiscal" TEXT NOT NULL,
    "representanteLegal" TEXT NOT NULL,
    "dniRepresentante" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "informacion_legal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rubros_nombre_key" ON "rubros"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "rubros_slug_key" ON "rubros"("slug");

-- CreateIndex
CREATE INDEX "rubros_estado_idx" ON "rubros"("estado");

-- CreateIndex
CREATE INDEX "rubros_orden_idx" ON "rubros"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "planes_nombre_key" ON "planes"("nombre");

-- CreateIndex
CREATE INDEX "planes_estado_idx" ON "planes"("estado");

-- CreateIndex
CREATE INDEX "planes_nivelPlan_idx" ON "planes"("nivelPlan");

-- CreateIndex
CREATE INDEX "empresas_planes_empresaId_idx" ON "empresas_planes"("empresaId");

-- CreateIndex
CREATE INDEX "empresas_planes_estado_idx" ON "empresas_planes"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_ruc_key" ON "empresas"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE INDEX "empresas_estado_idx" ON "empresas"("estado");

-- CreateIndex
CREATE INDEX "empresas_verificada_idx" ON "empresas"("verificada");

-- CreateIndex
CREATE INDEX "empresas_rubroId_idx" ON "empresas"("rubroId");

-- CreateIndex
CREATE INDEX "empresas_razonSocial_idx" ON "empresas"("razonSocial");

-- CreateIndex
CREATE INDEX "empresas_nombreComercial_idx" ON "empresas"("nombreComercial");

-- CreateIndex
CREATE INDEX "sedes_empresaId_idx" ON "sedes"("empresaId");

-- CreateIndex
CREATE INDEX "sedes_estado_idx" ON "sedes"("estado");

-- CreateIndex
CREATE INDEX "sedes_esPrincipal_idx" ON "sedes"("esPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_sedeId_key" ON "ubicaciones"("sedeId");

-- CreateIndex
CREATE INDEX "ubicaciones_distrito_provincia_departamento_idx" ON "ubicaciones"("distrito", "provincia", "departamento");

-- CreateIndex
CREATE INDEX "ubicaciones_latitud_longitud_idx" ON "ubicaciones"("latitud", "longitud");

-- CreateIndex
CREATE UNIQUE INDEX "contactos_sede_sedeId_key" ON "contactos_sede"("sedeId");

-- CreateIndex
CREATE INDEX "contactos_sede_telefonoPrincipal_idx" ON "contactos_sede"("telefonoPrincipal");

-- CreateIndex
CREATE INDEX "contactos_sede_emailPrincipal_idx" ON "contactos_sede"("emailPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "configuraciones_sede_sedeId_key" ON "configuraciones_sede"("sedeId");

-- CreateIndex
CREATE INDEX "horarios_sede_sedeId_idx" ON "horarios_sede"("sedeId");

-- CreateIndex
CREATE UNIQUE INDEX "horarios_sede_sedeId_diaSemana_key" ON "horarios_sede"("sedeId", "diaSemana");

-- CreateIndex
CREATE INDEX "zonas_cobertura_sedeId_idx" ON "zonas_cobertura"("sedeId");

-- CreateIndex
CREATE INDEX "zonas_cobertura_activo_idx" ON "zonas_cobertura"("activo");

-- CreateIndex
CREATE INDEX "zonas_cobertura_centroLatitud_centroLongitud_idx" ON "zonas_cobertura"("centroLatitud", "centroLongitud");

-- CreateIndex
CREATE UNIQUE INDEX "informacion_legal_empresaId_key" ON "informacion_legal"("empresaId");

-- AddForeignKey
ALTER TABLE "empresas_planes" ADD CONSTRAINT "empresas_planes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_planes" ADD CONSTRAINT "empresas_planes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "planes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_rubroId_fkey" FOREIGN KEY ("rubroId") REFERENCES "rubros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sedes" ADD CONSTRAINT "sedes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicaciones" ADD CONSTRAINT "ubicaciones_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contactos_sede" ADD CONSTRAINT "contactos_sede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuraciones_sede" ADD CONSTRAINT "configuraciones_sede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horarios_sede" ADD CONSTRAINT "horarios_sede_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas_cobertura" ADD CONSTRAINT "zonas_cobertura_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informacion_legal" ADD CONSTRAINT "informacion_legal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
