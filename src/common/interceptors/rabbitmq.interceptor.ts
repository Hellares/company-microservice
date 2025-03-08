
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RmqContext } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { ErrorClassifier } from '../utils/error-classifier';



@Injectable()
export class RabbitMQInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext('RabbitMQInterceptor');
  }

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
            // Opcional: reducir logs de éxito en producción
            if (process.env.NODE_ENV !== 'production') {
              this.logger.debug({ pattern }, 'Mensaje procesado correctamente');
            }
          } catch (err) {
            if (err.message !== 'Channel closed') {
              this.logger.error({ err, pattern }, 'Error al confirmar mensaje');
            }
          }
        },
        error: (error) => {
          try {
            const isBusinessError = ErrorClassifier.isBusinessError(error);

            if (isBusinessError) {
              this.logger.warn({ 
                pattern, 
                errorMessage: error.message,
                errorType: 'business' 
              }, 'Error de negocio');
              
              channel.ack(originalMsg);
            } else {
              const retryCount = this.getRetryCount(originalMsg);
              if (retryCount < 3) {
                this.logger.warn({ 
                  pattern, 
                  retryCount: retryCount + 1,
                  maxRetries: 3 
                }, 'Reintentando mensaje');
                
                this.incrementRetryCount(originalMsg);
                channel.nack(originalMsg, false, true);
              } else {
                this.logger.error({ 
                  err: error,
                  pattern,
                  retryCount,
                  stack: error.stack 
                }, 'Mensaje fallido después de 3 intentos');
                
                channel.ack(originalMsg);
              }
            }
          } catch (err) {
            if (err.message !== 'Channel closed') {
              this.logger.error({ err, pattern }, 'Error al manejar mensaje');
            }
          }
        },
      }),
    );
  }

  // Métodos auxiliares
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