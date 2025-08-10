import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { ValidationPipe, Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { DateFormatInterceptor } from '@jtorres/nestjs-common';


async function bootstrap() {
  // Crear logger
  const logger = new Logger('CompanyMS');
  
  try {
    logger.log('Iniciando microservicio de empresa');

    logger.log('Verificando conexión RabbitMQ...');
    await ensureRabbitMQConnection(envs.rabbitmqServers, logger);
    
    // Crear la aplicación microservicio
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(
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
              'x-expires': 600000     // 10 minutos
            }
          },
          noAck: false,
          prefetchCount: envs.rabbitmq.prefetchCount || 4,
          socketOptions: {
            heartbeatIntervalInSeconds: 5, 
            reconnectTimeInSeconds: 5
          }
        },
        logger: ['error', 'warn', 'log', 'debug'], // Permitir todos los niveles de log
      }
    );
    
    // Configurar validación global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    app.useGlobalInterceptors(new DateFormatInterceptor());

       
    logger.debug('Validación global configurada');
    
    // Obtener el servicio Prisma para poder cerrarlo adecuadamente
    const prismaService = app.get(PrismaService);
    
    // Manejar shutdown graceful
    const cleanup = async (signal: string) => {
      logger.log(`Recibida señal ${signal}, iniciando apagado graceful...`);
      
      try {
        // Cerrar servicio
        await app.close();
        logger.log('Microservicio cerrado correctamente');
        
        // Cerrar conexión a la base de datos
        await prismaService.$disconnect();
        logger.log('Conexión a base de datos cerrada correctamente');
        
        process.exit(0);
      } catch (error) {
        logger.error(`Error durante el apagado: ${error.message}`);
        process.exit(1);
      }
    };
    
    // Registrar manejadores para señales
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.once(signal, () => cleanup(signal));
    });
    
    // Manejar excepciones y promesas no manejadas
    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Promesa no manejada rechazada: ${reason}`);
    });
    
    process.on('uncaughtException', (error) => {
      logger.error(`Error no capturado: ${error.message}`);
      cleanup('uncaughtException');
    });
    
    // Iniciar el microservicio
    await app.listen();
    logger.log(`Microservicio Company - Empresa corriendo en el puerto ${envs.port}`);
    
  } catch (error) {
    logger.error(`Error al iniciar el microservicio: ${error.message}`);
    process.exit(1);
  }

  async function ensureRabbitMQConnection(urls: string[], logger: Logger): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const amqp = require('amqplib');
    
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        logger.log(`Intento ${attempt} de conexión a RabbitMQ...`);
        await amqp.connect(urls[0]);
        logger.log('Verificación de conexión RabbitMQ exitosa');
        return;
      } catch (error) {
        logger.warn(`Error al conectar con RabbitMQ: ${error.message}`);
        if (attempt < 5) {
          logger.log(`Esperando 2 segundos antes del próximo intento...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error(`No se pudo establecer conexión con RabbitMQ después de 5 intentos`);
        }
      }
    }
  }
}

bootstrap();