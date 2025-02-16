// src/plan/plan-validator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { ValidationResult } from './interfaces/plan-validation.interface';
import { PlanFeatures } from './interfaces/plan-features.interface';
import { PlanLimits } from './interfaces/plan-limits.interface';

@Injectable()
export class PlanValidatorService {
  private readonly logger = new Logger('PlanValidatorService');

  constructor(private readonly prisma: PrismaService) {}

  private async getActivePlan(empresaId: string) {
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

    return empresaPlan;
  }

  async validateLimit(
    empresaId: string,
    limitType: keyof PlanLimits,
    currentCount: number
  ): Promise<ValidationResult> {
    try {
      const empresaPlan = await this.getActivePlan(empresaId);
      const { limites } = empresaPlan.plan;
      const limit = (limites as unknown as PlanLimits)[limitType];

      const isValid = currentCount < limit;
      
      return {
        isValid,
        message: isValid 
          ? `Dentro del límite permitido (${currentCount}/${limit})`
          : `Se ha alcanzado el límite de ${limitType} (${limit})`,
        currentUsage: currentCount,
        limit
      };
    } catch (error) {
      this.logger.error(`Error validando límite ${limitType}:`, error);
      throw error;
    }
  }

  async validateFeature(
    empresaId: string,
    feature: keyof PlanFeatures
  ): Promise<ValidationResult> {
    try {
      const empresaPlan = await this.getActivePlan(empresaId);
      const { caracteristicas } = empresaPlan.plan;
      const isEnabled = (caracteristicas as unknown as PlanFeatures)[feature];

      return {
        isValid: isEnabled,
        message: isEnabled
          ? `La característica ${feature} está habilitada`
          : `La característica ${feature} no está disponible en el plan actual`,
      };
    } catch (error) {
      this.logger.error(`Error validando característica ${feature}:`, error);
      throw error;
    }
  }

  async validatePlanStatus(empresaId: string): Promise<ValidationResult> {
    try {
      const empresaPlan = await this.getActivePlan(empresaId);
      
      const now = new Date();
      const planVencido = empresaPlan.fechaFin && empresaPlan.fechaFin < now;
  
      if (planVencido) {
        return {
          isValid: false,
          message: 'El plan actual ha vencido',
        };
      }
  
      const diasRestantes = empresaPlan.fechaFin 
        ? Math.ceil((empresaPlan.fechaFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
  
      return {
        isValid: true,
        message: `Plan activo. Días restantes: ${diasRestantes}`,
        currentUsage: diasRestantes,
      };
    } catch (error) {
      this.logger.error('Error validando estado del plan:', error);
      throw error;
    }
  }
}