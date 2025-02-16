// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { MicroserviceOptions, Transport } from '@nestjs/microservices';
// import { envs } from './config/envs';
// import { Logger, ValidationPipe } from '@nestjs/common';
// import { CONSOLE_COLORS } from './common/constants/colors.constants';
// import { PrismaService } from './prisma/prisma.service';
// import { tap, finalize } from 'rxjs/operators';
// import { RabbitMQInterceptor } from './common/interceptors/rabbitmq.interceptor';

// async function bootstrap() {
//   const logger = new Logger(`${CONSOLE_COLORS.TEXT.MAGENTA}Company Microservice`);
//   let app;
//   let shuttingDown = false;
//   let pendingOperations = 0;

//   try {
//     app = await NestFactory.createMicroservice<MicroserviceOptions>(
//       AppModule,
//       {
//         transport: Transport.RMQ,
//         options: {
//           urls: envs.rabbitmqServers,
//           queue: 'company_queue',
//           queueOptions: {
//             durable: true,
//           },
//           noAck: false,
//         },
//       }
//     );

//     const prismaService = app.get(PrismaService);

//     // Usar el nuevo RabbitMQInterceptor junto con el interceptor existente
//     app.useGlobalInterceptors(
//       new RabbitMQInterceptor(),
//       {
//         intercept: (context, next) => {
//           if (!shuttingDown) {
//             pendingOperations++;
//             return next.handle().pipe(
//               tap({
//                 error: (error) => {
//                   logger.error('Error en operación:', error);
//                 }
//               }),
//               finalize(() => {
//                 pendingOperations--;
//               })
//             );
//           }
//           return next.handle();
//         },
//       }
//     );

//     app.useGlobalPipes(
//       new ValidationPipe({
//         whitelist: true,
//         forbidNonWhitelisted: true,
//         transformOptions: {
//           enableImplicitConversion: true,
//         },
//       })
//     );

//     const waitForPendingOperations = async (maxWaitTime = 5000) => {
//       const startTime = Date.now();
      
//       while (pendingOperations > 0 && Date.now() - startTime < maxWaitTime) {
//         logger.log(`Esperando ${pendingOperations} operaciones pendientes...`);
//         await new Promise(resolve => setTimeout(resolve, 100));
//       }
      
//       if (pendingOperations > 0) {
//         logger.warn(`Tiempo de espera agotado con ${pendingOperations} operaciones pendientes`);
//       }
//     };

//     const gracefulShutdown = async (signal: string) => {
//       if (shuttingDown) {
//         logger.warn('Ya existe un proceso de apagado en curso...');
//         return;
//       }

//       shuttingDown = true;
//       logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Recibida señal ${signal}, iniciando apagado graceful...`);

//       try {
//         logger.log('Deteniendo aceptación de nuevas conexiones...');
        
//         // Esperar operaciones pendientes
//         await waitForPendingOperations();

//         // Cerrar conexiones en orden
//         try {
//           if (app) {
//             logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Cerrando el microservicio...`);
//             await app.close();
//             logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Microservicio cerrado correctamente`);
//           }
//         } catch (err) {
//           logger.error(`Error al cerrar el microservicio: ${err.message}`);
//         }

//         try {
//           if (prismaService) {
//             logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Cerrando conexión con la base de datos...`);
//             await prismaService.$disconnect();
//             logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Conexión con la base de datos cerrada correctamente`);
//           }
//         } catch (err) {
//           logger.error(`Error al cerrar la conexión de la base de datos: ${err.message}`);
//         }

//         logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Apagado graceful completado`);
//         process.exit(0);
//       } catch (error) {
//         logger.error(`${CONSOLE_COLORS.TEXT.RED}Error durante el apagado:`, error);
//         process.exit(1);
//       }
//     };

//     // Manejo de señales
//     ['SIGTERM', 'SIGINT'].forEach(signal => {
//       process.once(signal, () => gracefulShutdown(signal));
//     });

//     process.on('unhandledRejection', (reason, promise) => {
//       logger.error(`${CONSOLE_COLORS.TEXT.RED}Promesa no manejada rechazada:`, {
//         reason: reason instanceof Error ? {
//           message: reason.message,
//           stack: reason.stack,
//           name: reason.name
//         } : reason,
//         type: typeof reason
//       });
//     });

//     process.on('uncaughtException', (error) => {
//       logger.error(`${CONSOLE_COLORS.TEXT.RED}Error no capturado:`, {
//         error: {
//           message: error.message,
//           stack: error.stack,
//           name: error.name
//         }
//       });
//       gracefulShutdown('uncaughtException');
//     });

//     await app.listen();
//     logger.log(`${CONSOLE_COLORS.TEXT.CYAN}Running on port ${envs.port}`);
//   } catch (error) {
//     logger.error(`${CONSOLE_COLORS.TEXT.RED}Error al iniciar el microservicio:`, error);
//     process.exit(1);
//   }
// }

// bootstrap();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CONSOLE_COLORS } from './common/constants/colors.constants';
import { PrismaService } from './prisma/prisma.service';
import { tap, finalize } from 'rxjs/operators';
import { RabbitMQInterceptor } from './common/interceptors/rabbitmq.interceptor';

class AppBootstrap {
  private app: any;
  private prismaService: PrismaService;
  private shuttingDown = false;
  private pendingOperations = 0;
  private readonly logger = new Logger(`${CONSOLE_COLORS.TEXT.MAGENTA}Company Microservice`);

  async init() {
    try {
      await this.createMicroservice();
      await this.setupMiddlewares();
      await this.setupErrorHandling();
      await this.startApplication();
    } catch (error) {
      this.logger.error(`${CONSOLE_COLORS.TEXT.RED}Error al iniciar el microservicio:`, error);
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
          queueOptions: { durable: true },
          noAck: false,
          prefetchCount:1
        },
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
    this.app.useGlobalInterceptors(
      new RabbitMQInterceptor(),
      {
        intercept: (context, next) => {
          if (!this.shuttingDown) {
            this.pendingOperations++;
            return next.handle().pipe(
              tap({
                error: (error) => {
                  this.logger.error('Error en operación:', error);
                }
              }),
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
      this.logger.log(`Esperando ${this.pendingOperations} operaciones pendientes...`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.pendingOperations > 0) {
      this.logger.warn(`Tiempo de espera agotado con ${this.pendingOperations} operaciones pendientes`);
    }
  }

  private async gracefulShutdown(signal: string) {
    if (this.shuttingDown) {
      this.logger.warn('Ya existe un proceso de apagado en curso...');
      return;
    }

    this.shuttingDown = true;
    this.logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Recibida señal ${signal}, iniciando apagado graceful...`);

    try {
      await this.performShutdown();
      process.exit(0);
    } catch (error) {
      this.logger.error(`${CONSOLE_COLORS.TEXT.RED}Error durante el apagado:`, error);
      process.exit(1);
    }
  }

  private async performShutdown() {
    this.logger.log('Deteniendo aceptación de nuevas conexiones...');
    await this.waitForPendingOperations();
    await this.closeConnections();
    this.logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Apagado graceful completado`);
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
        this.logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Cerrando el microservicio...`);
        await this.app.close();
        this.logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Microservicio cerrado correctamente`);
      }
    } catch (err) {
      this.logger.error(`Error al cerrar el microservicio: ${err.message}`);
    }
  }

  private async closeDatabaseConnection() {
    try {
      if (this.prismaService) {
        this.logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Cerrando conexión con la base de datos...`);
        await this.prismaService.$disconnect();
        this.logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Conexión con la base de datos cerrada correctamente`);
      }
    } catch (err) {
      this.logger.error(`Error al cerrar la conexión de la base de datos: ${err.message}`);
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
    this.logger.error(`${CONSOLE_COLORS.TEXT.RED}Promesa no manejada rechazada:`, {
      reason: reason instanceof Error ? {
        message: reason.message,
        stack: reason.stack,
        name: reason.name
      } : reason,
      type: typeof reason
    });
  }

  private handleUncaughtException(error: Error) {
    this.logger.error(`${CONSOLE_COLORS.TEXT.RED}Error no capturado:`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    });
    this.gracefulShutdown('uncaughtException');
  }

  private async startApplication() {
    await this.app.listen();
    this.logger.log(`${CONSOLE_COLORS.TEXT.CYAN}Running on port ${envs.port}`);
  }
}

// Iniciar la aplicación
async function bootstrap() {
  const app = new AppBootstrap();
  await app.init();
}

bootstrap();