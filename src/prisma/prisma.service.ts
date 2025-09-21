import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      errorFormat: 'pretty',
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión a base de datos establecida');
      
      
      // Verificar conectividad inicial
      await this.healthCheck();

      setInterval(async () => {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.debug('🔍 Pool health check: OK');
    } catch (error) {
      this.logger.error(`❌ Pool health check failed: ${error.message}`);
    }
  }, 120000);
      
    } catch (error) {
      this.logger.error(`Error conectando a la base de datos: ${error.message}`);
      throw error;
    }
  }

 async onModuleDestroy() {
  try {
    this.logger.log('Cerrando conexiones de Prisma...');
    await this.$disconnect();
    this.logger.log('Prisma disconnect completado');
  } catch (error) {
    this.logger.error(`Error cerrando conexión: ${error.message}`);
  }
}

  // Método para verificar salud de la conexión
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.debug('Health check exitoso');
      return true;
    } catch (error) {
      this.logger.error(`Health check falló: ${error.message}`);
      return false;
    }
  }

  // Wrapper para queries con logging manual
  async safeQuery<T>(queryFn: () => Promise<T>, operationName: string): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      if (duration > 2000) {
        this.logger.warn(`Query lenta en ${operationName}: ${duration}ms`);
      } else {
        this.logger.debug(`Query ${operationName} completada en ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error en ${operationName} (${duration}ms): ${error.message}`);
      throw error;
    }
  }
}