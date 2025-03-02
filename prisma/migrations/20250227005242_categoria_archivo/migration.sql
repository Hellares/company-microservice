-- CreateEnum
CREATE TYPE "CategoriaArchivo" AS ENUM ('LOGO', 'PORTADA', 'SERVICIO', 'PRODUCTO', 'GALERIA', 'TESTIMONIO', 'PUBLICIDAD', 'DOCUMENTO', 'VIDEO', 'OTRO');

-- CreateTable
CREATE TABLE "archivos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "empresaId" TEXT NOT NULL,
    "categoria" "CategoriaArchivo" NOT NULL,
    "entidadId" TEXT,
    "tipoEntidad" TEXT,
    "descripcion" TEXT,
    "orden" INTEGER,
    "esPublico" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "archivos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "archivos_empresaId_categoria_idx" ON "archivos"("empresaId", "categoria");

-- CreateIndex
CREATE INDEX "archivos_entidadId_tipoEntidad_idx" ON "archivos"("entidadId", "tipoEntidad");

-- AddForeignKey
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
