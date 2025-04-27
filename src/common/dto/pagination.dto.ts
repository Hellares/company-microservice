import { CategoriaArchivo } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsPositive } from "class-validator";

export class PaginationDto {
    
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;
  
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

}

export class ArchivosByEmpresaDto extends PaginationDto {
 
  @IsOptional()
  @IsEnum(CategoriaArchivo)
  categoria?: CategoriaArchivo;

  @IsOptional()
  empresaId?: string;
}