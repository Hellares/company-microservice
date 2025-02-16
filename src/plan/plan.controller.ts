// src/plan/plan.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PlanService } from './plan.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { NivelPlan } from '@prisma/client';

@Controller()
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @MessagePattern('create.plan')
  async create(@Payload() createPlanDto: CreatePlanDto) {
    return await this.planService.create(createPlanDto);
  }

  @MessagePattern('update.plan')
  async update(
    @Payload() payload: { id: string; updatePlanDto: UpdatePlanDto }
  ) {
    return await this.planService.update(payload.id, payload.updatePlanDto);
  }

  @MessagePattern('assign.basic.plan')
  async assignBasicPlan(@Payload() empresaId: string) {
    return await this.planService.assignBasicPlan(empresaId);
  }

  @MessagePattern('find.plan.history')
  async getPlanHistory(@Payload() empresaId: string) {
    return await this.planService.getPlanHistory(empresaId);
  }

  @MessagePattern('find.active.plan')
  async findActivePlan(@Payload() empresaId: string) {
    return await this.planService.findActivePlan(empresaId);
  }


@MessagePattern('find.all.plans')
async findAll(@Payload() filters?: {
  estado?: boolean;
  nivelPlan?: NivelPlan;
}) {
  return await this.planService.findAll(filters);
}
}