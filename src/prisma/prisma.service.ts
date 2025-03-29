// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {


  constructor(
    private readonly logger: PinoLogger
    
  ) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      // configuración para mejorar la gestión de conexiones
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      errorFormat: 'pretty',
    });

    // Establecer el contexto para todos los logs
    this.logger.setContext('PrismaService');


    //Extensiones avanzadas
    this.$extends({
      name: 'customLogger',
      query: {
        async $allOperations({ operation, model, args, query }) {
          const start = Date.now();
          
          try {
            const result = await query(args);
            const duration = Date.now() - start;
            
            // Usar formato de objeto para mejor rendimiento
            this.logger.debug({
              model,
              operation,
              duration,
              timestamp: new Date().toISOString()
            }, `Query ${model}.${operation} completada`);
            
            return result;
          } catch (error) {
            // Log estructurado para errores
            this.logger.error({
              model,
              operation,
              error: {
                message: error.message,
                code: error.code,
                meta: error.meta
              }
            }, `Error en prisma ${model}.${operation}`);
            throw error;
          }
        },
      },
      
      // model: {
      //   // Extensiones específicas para modelos
      //   company: {
      //     async softDelete(id: string) {
      //       return this.company.update({
      //         where: { id },
      //         data: { active: false }
      //       });
      //     },
      //   },
      // },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.info('Conexion a base de datos establecida');
  }

  async onModuleDestroy() {
    this.logger.info('Cerrando conexión a base de datos');
    await this.$disconnect();
  }
}