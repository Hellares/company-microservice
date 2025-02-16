import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RmqContext, RpcException } from '@nestjs/microservices';
import { CONSOLE_COLORS } from '../constants/colors.constants';

@Injectable()
export class RabbitMQInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RabbitMQInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rmqContext = context.switchToRpc().getContext<RmqContext>();
    const channel = rmqContext.getChannelRef();
    const originalMsg = rmqContext.getMessage();
    const pattern = rmqContext.getPattern();

    return next.handle().pipe(
      tap({
        next: (result) => {
          try {
            channel.ack(originalMsg);
            this.logger.log(`${CONSOLE_COLORS.TEXT.GREEN}Mensaje procesado correctamente: ${pattern}`);
          } catch (err) {
            // Ignorar errores de canal cerrado durante el shutdown
            if (err.message !== 'Channel closed') {
              this.logger.error(`Error al confirmar mensaje: ${err.message}`);
            }
          }
        },
        error: (error) => {
          try {
            // Verificar si es un error de negocio
            const isBusinessError = 
              error instanceof RpcException || 
              error?.response?.code || 
              error?.status === 400 ||
              error.message.includes('Ya existe');

            if (isBusinessError) {
              this.logger.warn(
                `${CONSOLE_COLORS.TEXT.YELLOW}Error de negocio en ${pattern}: ${error.message}`
              );
              channel.ack(originalMsg);
            } else {
              // Solo reintentar errores técnicos genuinos
              const retryCount = this.getRetryCount(originalMsg);
              if (retryCount < 3) {
                this.logger.warn(
                  `${CONSOLE_COLORS.TEXT.YELLOW}Reintentando mensaje ${pattern}. Intento ${retryCount + 1}/3`
                );
                this.incrementRetryCount(originalMsg);
                channel.nack(originalMsg, false, true);
              } else {
                this.logger.error(
                  `${CONSOLE_COLORS.TEXT.RED}Mensaje fallido después de 3 intentos: ${pattern}`,
                  error.stack
                );
                channel.ack(originalMsg);
              }
            }
          } catch (err) {
            // Ignorar errores de canal cerrado durante el shutdown
            if (err.message !== 'Channel closed') {
              this.logger.error(`Error al manejar mensaje: ${err.message}`);
            }
          }
        },
      }),
    );
  }

  private getRetryCount(msg: any): number {
    const headers = msg.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  private incrementRetryCount(msg: any) {
    if (!msg.properties.headers) {
      msg.properties.headers = {};
    }
    msg.properties.headers['x-retry-count'] = this.getRetryCount(msg) + 1;
  }
}