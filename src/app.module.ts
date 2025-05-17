import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { EmpresaModule } from './empresa/empresa.module';
import { RubroModule } from './rubro/rubro.module';
import { PlanModule } from './plan/plan.module';
import { ArchivosModule } from './archivos/archivo.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RabbitMQInterceptor } from './common/interceptors/rabbitmq.interceptor';
import { StorageModule } from './storage/storage.module';


@Module({
  imports: [
    PrismaModule,
    EmpresaModule,
    RubroModule,
    PlanModule,
    ArchivosModule,
    StorageModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RabbitMQInterceptor,
    },

  ],
})
export class AppModule {}