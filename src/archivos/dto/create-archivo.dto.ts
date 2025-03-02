// src/archivos/dto/create-archivo.dto.ts
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { CategoriaArchivo } from '@prisma/client';

export class CreateArchivoDto {
  @IsString()
  nombre: string;

  @IsString()
  filename: string;

  @IsString()
  ruta: string;

  @IsString()
  tipo: string;

  @IsNumber()
  tamanho: number;

  @IsString()
  @IsOptional()
  empresaId?: string;

  @IsEnum(CategoriaArchivo)
  categoria: CategoriaArchivo;

  @IsString()
  @IsOptional()
  entidadId?: string;

  @IsString()
  @IsOptional()
  tipoEntidad?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @IsOptional()
  orden?: number;

  @IsBoolean()
  @IsOptional()
  esPublico?: boolean;
}