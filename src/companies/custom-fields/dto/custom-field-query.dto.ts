import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CustomFieldType } from '../enums/custom-field-type.enum';

export class CustomFieldQueryDto {
  @IsOptional()
  @IsEnum(CustomFieldType, { message: 'Tipo de campo no válido' })
  fieldType?: CustomFieldType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}