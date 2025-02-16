// src/plan/plan.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { RpcException } from '@nestjs/microservices';
import { NivelPlan, Prisma } from '@prisma/client';
import { PlanLimits } from './interfaces/plan-limits.interface';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { FindPlansFiltersDto } from './dto/find-plans.filters';

@Injectable()
export class PlanService {
  private readonly logger = new Logger('PlanService');

  constructor(private readonly prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto) {
    try {
      const planData: Prisma.PlanCreateInput = {
        nombre: createPlanDto.nombre,
        descripcion: createPlanDto.descripcion,
        precio: new Prisma.Decimal(createPlanDto.precio),
        duracionDias: createPlanDto.duracionDias,
        nivelPlan: createPlanDto.nivelPlan,
        caracteristicas: createPlanDto.caracteristicas as unknown as Prisma.JsonValue,
        limites: createPlanDto.limites as unknown as Prisma.JsonValue,
        estado: createPlanDto.estado,
      };

      const plan = await this.prisma.plan.create({
        data: planData,
      });

      this.logger.log(`Plan creado exitosamente: ${plan.id}`);

      return {
        data: plan,
        message: 'Plan creado exitosamente',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new RpcException({
            message: 'Ya existe un plan con ese nombre',
            status: 409,
            code: 'DUPLICATE_PLAN_NAME',
          });
        }
      }
      throw new RpcException({
        message: 'Error al crear el plan',
        status: 500,
        code: 'CREATE_PLAN_ERROR',
        detail: error.message,
      });
    }
  }



  // En plan.service.ts, agregar estos métodos

async findActivePlan(empresaId: string) {
  try {
    const empresaPlan = await this.prisma.empresaPlan.findFirst({
      where: {
        empresaId,
        estado: 'ACTIVO',
      },
      include: {
        plan: true,
      },
    });

    if (!empresaPlan) {
      throw new RpcException({
        message: 'No se encontró un plan activo para la empresa',
        status: 404,
        code: 'ACTIVE_PLAN_NOT_FOUND',
      });
    }

    return {
      data: empresaPlan,
      message: 'Plan activo encontrado',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error(`Error buscando plan activo para empresa ${empresaId}:`, error);
    throw error;
  }
}

async findAll(filters?: FindPlansFiltersDto) {
  try {
    const plans = await this.prisma.plan.findMany({
      where: {
        estado: filters?.estado,
        nivelPlan: filters?.nivelPlan,
      },
      orderBy: {
        precio: 'asc',
      },
    });

    return {
      data: plans,
      message: 'Planes encontrados exitosamente',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error('Error buscando planes:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new RpcException({
        message: 'Error en la base de datos',
        status: 500,
        code: `DB_ERROR_${error.code}`,
        detail: error.message,
      });
    }
    throw new RpcException({
      message: 'Error al buscar planes',
      status: 500,
      code: 'FIND_PLANS_ERROR',
      detail: error.message,
    });
  }
}


async update(id: string, updatePlanDto: UpdatePlanDto) {
  try {
    const planExistente = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        empresasPlanes: {
          where: {
            estado: 'ACTIVO'
          }
        }
      }
    });

    if (!planExistente) {
      throw new RpcException({
        message: 'Plan no encontrado',
        status: 404,
        code: 'PLAN_NOT_FOUND',
      });
    }

    if (planExistente.empresasPlanes.length > 0 && updatePlanDto.limites) {
      // Verificar que no se reduzcan límites para planes activos
      const limitesPrevios = planExistente.limites as unknown as PlanLimits;
      const nuevosLimites = updatePlanDto.limites as PlanLimits;
      
      for (const [key, value] of Object.entries(nuevosLimites)) {
        if (value < limitesPrevios[key]) {
          throw new RpcException({
            message: `No se pueden reducir los límites de un plan con empresas activas`,
            status: 400,
            code: 'INVALID_LIMIT_REDUCTION',
          });
        }
      }
    }

    const planData = {
      ...updatePlanDto,
      precio: updatePlanDto.precio ? new Prisma.Decimal(updatePlanDto.precio) : undefined,
    };

    const planActualizado = await this.prisma.plan.update({
      where: { id },
      data: planData,
    });

    return {
      data: planActualizado,
      message: 'Plan actualizado exitosamente',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error(`Error actualizando plan ${id}:`, error);
    throw error;
  }
}

async getPlanHistory(empresaId: string) {
  try {
    const historial = await this.prisma.empresaPlan.findMany({
      where: {
        empresaId,
      },
      include: {
        plan: {
          select: {
            nombre: true,
            nivelPlan: true,
            caracteristicas: true,
            limites: true,
          },
        },
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    });

    return {
      data: historial,
      message: 'Historial de planes obtenido exitosamente',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    this.logger.error(`Error obteniendo historial de planes para empresa ${empresaId}:`, error);
    throw error;
  }
}
private async validatePlanDates(empresaId: string, fechaInicio: Date, fechaFin: Date) {
  const planesActivos = await this.prisma.empresaPlan.findMany({
    where: {
      empresaId,
      estado: 'ACTIVO',
      OR: [
        {
          fechaInicio: {
            lte: fechaFin,
          },
          fechaFin: {
            gte: fechaInicio,
          },
        },
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      ],
    },
  });

  if (planesActivos.length > 0) {
    throw new RpcException({
      message: 'Existe un plan activo que se solapa con las fechas proporcionadas',
      status: 400,
      code: 'PLAN_DATE_OVERLAP',
    });
  }
}

// Modificar el método assignBasicPlan para incluir la validación
async assignBasicPlan(empresaId: string) {
  try {
    const planBasico = await this.prisma.plan.findFirst({
      where: {
        nivelPlan: 'BASICO',
        estado: true,
      },
    });

    if (!planBasico) {
      throw new RpcException({
        message: 'No se encontró un plan básico activo',
        status: 404,
        code: 'BASIC_PLAN_NOT_FOUND',
      });
    }

    const fechaInicio = new Date();
    const fechaFin = new Date(Date.now() + planBasico.duracionDias * 24 * 60 * 60 * 1000);

    // Validar solapamiento de fechas
    await this.validatePlanDates(empresaId, fechaInicio, fechaFin);

    const empresaPlan = await this.prisma.empresaPlan.create({
      data: {
        empresaId,
        planId: planBasico.id,
        estado: 'ACTIVO',
        montoPagado: new Prisma.Decimal(0),
        fechaInicio,
        fechaFin,
      },
      include: {
        plan: true,
      },
    });

    return empresaPlan;
  } catch (error) {
    this.logger.error(`Error asignando plan básico a empresa ${empresaId}:`, error);
    throw error;
  }
}
  // async assignBasicPlan(empresaId: string) {
  //   try {
  //     const planBasico = await this.prisma.plan.findFirst({
  //       where: {
  //         nivelPlan: 'BASICO',
  //         estado: true,
  //       },
  //     });

  //     if (!planBasico) {
  //       throw new RpcException({
  //         message: 'No se encontró un plan básico activo',
  //         status: 404,
  //         code: 'BASIC_PLAN_NOT_FOUND',
  //       });
  //     }

  //     const empresaPlan = await this.prisma.empresaPlan.create({
  //       data: {
  //         empresaId,
  //         planId: planBasico.id,
  //         estado: 'ACTIVO',
  //         montoPagado: new Prisma.Decimal(0),
  //         fechaInicio: new Date(),
  //         fechaFin: new Date(Date.now() + planBasico.duracionDias * 24 * 60 * 60 * 1000),
  //       },
  //       include: {
  //         plan: true,
  //       },
  //     });

  //     return empresaPlan;
  //   } catch (error) {
  //     this.logger.error(`Error asignando plan básico a empresa ${empresaId}:`, error);
  //     throw error;
  //   }
  // }
}