// src/companies/dto/custom-field.dto.ts
import { IsString, IsBoolean, IsNotEmpty, IsOptional, IsEnum, ValidateNested, ValidateIf, IsArray } from 'class-validator';
import { CustomFieldType } from '../enums/custom-field-type.enum';
import { WeekScheduleDto } from './schedule-field.dto';
import { Transform, Type } from 'class-transformer';
import { SelectValueDto } from './select-value.dto';


export class MultiSelectValueDto {
  @IsNotEmpty()
  @IsArray()
  options: string[];

  @IsNotEmpty()
  @IsArray()
  selected: string[];
}

export class CreateCustomFieldDto {
  @IsNotEmpty()
  @IsString()
  fieldName: string;

  @IsNotEmpty()
  @IsEnum(CustomFieldType)
  fieldType: CustomFieldType;

  @IsNotEmpty()
  @Transform(({ value, obj }) => {
    if (obj.fieldType === CustomFieldType.SELECT || 
      obj.fieldType === CustomFieldType.SCHEDULE ||
      obj.fieldType === CustomFieldType.MULTISELECT) {
      return typeof value === 'string' ? JSON.parse(value) : value;
    }
    return value;
  })
  // Solo validar como objeto anidado si es SELECT o SCHEDULE
  @ValidateIf(o => 
    o.fieldType === CustomFieldType.SELECT || 
    o.fieldType === CustomFieldType.SCHEDULE ||
    o.fieldType === CustomFieldType.MULTISELECT
  )
  @ValidateNested()
  @Type(({ object }) => {
    switch (object.fieldType) {
      case CustomFieldType.SELECT:
        return SelectValueDto;
      case CustomFieldType.SCHEDULE:
        return WeekScheduleDto;
      case CustomFieldType.MULTISELECT:
        return MultiSelectValueDto
      default:
        return String;
    }
  })
  // Para los demás tipos, validar como string
  @ValidateIf(o => 
    o.fieldType !== CustomFieldType.SELECT && 
    o.fieldType !== CustomFieldType.SCHEDULE &&
    o.fieldType !== CustomFieldType.MULTISELECT
  )
  @IsString()
  fieldValue: any;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean = false;
}