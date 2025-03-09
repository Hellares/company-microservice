import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, RpcException, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { ValidationPipe } from '@nestjs/common';
import { CONSOLE_COLORS } from './common/constants/colors.constants';
import { PrismaService } from './prisma/prisma.service';
import { tap, finalize } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';

// Clase auxiliar para determinar tipos de errores
class AppBootstrap {
  
  private app: any;
  private prismaService: PrismaService;
  private shuttingDown = false;
  private pendingOperations = 0;
  private logger: PinoLogger;

  async init() {
    try {
      await this.createMicroservice();
      // Usar resolve() en lugar de get() para PinoLogger
      this.logger = await this.app.resolve(PinoLogger);
      // Establecer contexto
      this.logger.setContext('APP-Main');
      await this.setupMiddlewares();
      this.setupErrorHandling();
      await this.startApplication();
    } catch (error) {
      console.error('Error al iniciar el microservicio:', error);
      process.exit(1);
    }
  }

  private async createMicroservice() {
    this.app = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        transport: Transport.RMQ,
        options: {
          urls: envs.rabbitmqServers,
          queue: 'company_queue',
          queueOptions: { 
            durable: true,
            arguments: {
              'x-message-ttl': 300000, // 5 minutos
              'x-expires': 600000      // 10 minutos
            }
           },
          noAck: false,
          prefetchCount:1
        },
        bufferLogs: true,
        logger: ['error', 'warn'],
        //logger: ['error', 'warn', 'log', 'debug'], //!no mostrar log de arranque
        
      }
    );
    this.prismaService = this.app.get(PrismaService);
  }

  private async setupMiddlewares() {
    // Configurar interceptores
    this.setupInterceptors();
    
    // Configurar validación global
    this.setupValidation();
  }

  private setupInterceptors() {
    // Este interceptor solo se encarga de rastrear operaciones pendientes
    // y no registra logs de errores
    this.app.useGlobalInterceptors(
      {
        intercept: (context, next) => {
          if (!this.shuttingDown) {
            this.pendingOperations++;
            return next.handle().pipe(
              // Importante: No agregamos un manejador de error aquí
            // para evitar logs duplicados
              finalize(() => {
                this.pendingOperations--;
              })
            );
          }
          return next.handle();
        },
      }
    );
  }

  private setupValidation() {
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );
  }

  private async waitForPendingOperations(maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (this.pendingOperations > 0 && Date.now() - startTime < maxWaitTime) {
      // this.logger.log(`Esperando ${this.pendingOperations} operaciones pendientes...`);
      this.logger.info({ pendingOps: this.pendingOperations }, `Esperando operaciones pendientes`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.pendingOperations > 0) {
      this.logger.warn(`Tiempo de espera agotado con ${this.pendingOperations} operaciones pendientes`);
    }
  }

  private async gracefulShutdown(signal: string) {
    if (this.shuttingDown) {
      // this.logger.warn('Ya existe un proceso de apagado en curso...');
      this.logger.warn({ pendingOps: this.pendingOperations }, `Tiempo de espera agotado con operaciones pendientes`);
      return;
    }

    this.shuttingDown = true;
    // this.logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Recibida señal ${signal}, iniciando apagado graceful...`);
    this.logger.info({ signal }, 'Iniciando apagado graceful');
    try {
      await this.performShutdown();
      process.exit(0);
    } catch (error) {
      // this.logger.error(`${CONSOLE_COLORS.TEXT.RED}Error durante el apagado:`, error);
      this.logger.error({ err: error }, 'Error durante el apagado');
      process.exit(1);
    }
  }

  private async performShutdown() {
    this.logger.info('Deteniendo aceptación de nuevas conexiones...');
    await this.waitForPendingOperations();
    await this.closeConnections();
    this.logger.info('Apagado graceful completado');
  }

  private async closeConnections() {
    // Cerrar microservicio
    await this.closeMicroservice();
    // Cerrar conexión con base de datos
    await this.closeDatabaseConnection();
  }

  private async closeMicroservice() {
    try {
      if (this.app) {
        this.logger.info('Cerrando el microservicio');
        await this.app.close();
        this.logger.info('Microservicio cerrado correctamente');
      }
    } catch (err) {
      this.logger.error({ err }, 'Error al cerrar el microservicio');
    }
  }

  private async closeDatabaseConnection() {
    try {
      if (this.prismaService) {
        this.logger.info('Cerrando conexión con la base de datos');
        await this.prismaService.$disconnect();
        this.logger.info('Conexión con la base de datos cerrada correctamente');
      }
    } catch (err) {
      this.logger.error({ err }, 'Error al cerrar la conexión de la base de datos');
    }
  }

  private setupErrorHandling() {
    // Manejo de señales
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.once(signal, () => this.gracefulShutdown(signal));
    });

    // Manejo de promesas no manejadas
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    
    // Manejo de excepciones no capturadas
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
  }

  private handleUnhandledRejection(reason: any, promise: Promise<any>) {
    this.logger.error({ 
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack,
        name: reason.name
      } : reason,
      type: typeof reason
    }, 'Promesa no manejada rechazada');
  }

  private handleUncaughtException(error: Error) {
    this.logger.error({
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    }, 'Error no capturado');
    this.gracefulShutdown('uncaughtException');
  }

  private async startApplication() {
    await this.app.listen();
    this.logger.info(`Microservicio Company - Empresa corriendo en el puerto ${envs.port}`);
  }
}

// Iniciar la aplicación
async function bootstrap() {
  const app = new AppBootstrap();
  await app.init();
}

bootstrap();

