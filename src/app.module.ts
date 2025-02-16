import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresaModule } from './empresa/empresa.module';
import { RubroModule } from './rubro/rubro.module';
import { PlanModule } from './plan/plan.module';

@Module({
  imports: [
    PrismaModule,
    EmpresaModule,
    RubroModule,
    PlanModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
