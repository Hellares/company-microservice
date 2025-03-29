import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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
    LoggerModule.forRoot({
      pinoHttp: {
        // Nivel de log: info en producción, debug en desarrollo
        level: process.env.NODE_ENV === 'production' ? 'debug' : 'info',

                // Clave para el mensaje principal
        messageKey: 'message',
        
        // Desactivar el logging automático de HTTP (mejor para microservicios)
        autoLogging: false,
        
        // Solo usar pretty en desarrollo, en producción mantener formato JSON puro
        transport: process.env.NODE_ENV !== 'production' 
          ? {
              target: 'pino-pretty',
              options: {
                messageKey: 'message',
                colorize: true,
                ignore: 'pid,hostname',
                translateTime: 'SYS:standard',
              },
            }
          : undefined, // En producción, usar JSON directo a stdout
        
        // Metadatos que se añadirán a todos los logs
        customProps: () => ({
          service: 'Company-microservice',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0',
        }),
        
        // Redactado de información sensible
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
          remove: true,
        },
        
        // Formato de serialización optimizado para producción
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
          err: (err) => ({
            type: err.constructor.name,
            message: err.message,
            stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
          }),
        },
      },
    }),
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
