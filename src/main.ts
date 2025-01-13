import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, RpcException, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { Logger, ValidationPipe } from '@nestjs/common';
import { CONSOLE_COLORS } from './common/constants/colors.constants';

async function bootstrap() {
  const logger = new Logger ( `${CONSOLE_COLORS.TEXT.MAGENTA}Company Microservice`);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: envs.rabbitmqServers,
        queue: 'company_queue',
        queueOptions: {
          durable: true,
        },           // Procesa un mensaje a la vez
        noAck: false,
      },
    }
  );

  

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map(error => ({
          field: error.property,
          message: Object.values(error.constraints).join(', ')
        }));
        
        throw new RpcException({
          message: 'Error de validación',
          errors: messages,
          status: 400
        });
      }
    })
  );


  await app.listen();
  logger.log(`${CONSOLE_COLORS.TEXT.CYAN}Running on port ${envs.port}`);
}
bootstrap();
