// src/plan/dto/find-plans-filters.dto.ts
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { NivelPlan } from '@prisma/client';

export class FindPlansFiltersDto {
  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @IsOptional()
  @IsEnum(NivelPlan)
  nivelPlan?: NivelPlan;
}