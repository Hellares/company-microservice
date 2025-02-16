import { Module } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanController } from './plan.controller';
import { PlanValidatorService } from './plan-validator.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [PlanController],
  providers: [
    PlanService,
    PlanValidatorService,
   // PrismaService,
  ],
  exports: [PlanService, PlanValidatorService],
})
export class PlanModule {}
