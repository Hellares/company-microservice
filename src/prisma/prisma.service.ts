import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  constructor() {
    super({
      // log: [
      //   { emit: 'stdout', level: 'query' },
      //   { emit: 'stdout', level: 'info' },
      //   { emit: 'stdout', level: 'warn' },
      //   { emit: 'stdout', level: 'error' },
      // ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      errorFormat: 'pretty',
    });

    // Extensiones avanzadas
    // this.$extends({
    //   name: 'customLogger',
    //   query: {
    //     async $allOperations({ operation, model, args, query }) {
    //       const start = Date.now();
          
    //       try {
    //         const result = await query(args);
    //         const duration = Date.now() - start;
            
    //         this.logger.debug(`Query ${model}.${operation} completada en ${duration}ms`);
            
    //         return result;
    //       } catch (error) {
    //         this.logger.error(`Error en prisma ${model}.${operation}: ${error.message}`, error.stack);
    //         throw error;
    //       }
    //     },
    //   },
    // });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexion a base de datos establecida');
  }

  async onModuleDestroy() {
    this.logger.log('Cerrando conexión a base de datos');
    await this.$disconnect();
  }
}