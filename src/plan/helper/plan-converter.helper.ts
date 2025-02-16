// src/plan/helpers/plan-converter.helper.ts
import { Prisma } from '@prisma/client';
import { CreatePlanDto } from '../dto/create-plan.dto';

export function convertToPrismaInput(dto: CreatePlanDto): Prisma.PlanCreateInput {
  return {
    nombre: dto.nombre.trim(),
    descripcion: dto.descripcion.trim(),
    precio: new Prisma.Decimal(dto.precio),
    duracionDias: dto.duracionDias,
    nivelPlan: dto.nivelPlan,
    caracteristicas: dto.caracteristicas as unknown as Prisma.JsonValue,
    limites: dto.limites as unknown as Prisma.JsonValue,
    estado: dto.estado,
  };
}