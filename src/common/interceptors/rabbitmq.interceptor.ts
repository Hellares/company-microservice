import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RmqContext } from '@nestjs/microservices';
import { ErrorClassifier } from '../utils/error-classifier';

// Clase para registrar valores de correlationId vistos recientemente
class CorrelationTracker {
  private static seenCorrelationIds = new Map<string, { timestamp: number, patterns: string[] }>();
  
  // Período de expiración para ids antiguos (5 minutos)
  private static readonly EXPIRATION_MS = 5 * 60 * 1000;
  
  // Registrar un correlationId y su patrón asociado
  static trackCorrelationId(correlationId: string, pattern: string): void {
    const entry = this.seenCorrelationIds.get(correlationId) || { 
      timestamp: Date.now(),
      patterns: []
    };
    
    // Añadir el patrón si no está ya registrado
    if (!entry.patterns.includes(pattern)) {
      entry.patterns.push(pattern);
    }
    
    // Actualizar timestamp
    entry.timestamp = Date.now();
    
    // Guardar entrada actualizada
    this.seenCorrelationIds.set(correlationId, entry);
    
    // Limpiar entradas antiguas periódicamente
    this.cleanupOldEntries();
  }
  
  // Verificar si un correlationId ha sido visto antes
  static hasSeenCorrelationId(correlationId: string): boolean {
    return this.seenCorrelationIds.has(correlationId);
  }
  
  // Obtener patrones asociados con un correlationId
  static getPatternsForCorrelationId(correlationId: string): string[] {
    return this.seenCorrelationIds.get(correlationId)?.patterns || [];
  }
  
  // Limpiar entradas antiguas
  private static cleanupOldEntries(): void {
    const now = Date.now();
    for (const [id, entry] of this.seenCorrelationIds.entries()) {
      if (now - entry.timestamp > this.EXPIRATION_MS) {
        this.seenCorrelationIds.delete(id);
      }
    }
  }
}

@Injectable()
export class RabbitMQInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RabbitMQInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const rmqContext = context.switchToRpc().getContext<RmqContext>();
    const channel = rmqContext.getChannelRef();
    const originalMsg = rmqContext.getMessage();
    const pattern = rmqContext.getPattern();
    
    // Obtener o generar correlationId
    const correlationId = originalMsg.properties.correlationId || this.generateId();
    
    // Generar un ID de operación único para esta solicitud específica
    const operationId = this.generateId();
    
    // Rastrear el correlationId y su patrón
    CorrelationTracker.trackCorrelationId(correlationId, pattern as string);
    
    // Comprobar si este correlationId ya ha sido visto
    const isReturnVisit = CorrelationTracker.hasSeenCorrelationId(correlationId);
    const relatedPatterns = CorrelationTracker.getPatternsForCorrelationId(correlationId);
    
    // Log mejorado con información de correlación
    if (isReturnVisit && relatedPatterns.length > 1) {
      this.logger.debug(
        `[${operationId}] Iniciando procesamiento del mensaje: ${pattern} ` +
        `(correlationId: ${correlationId}, patrones relacionados: ${relatedPatterns.join(', ')})`
      );
    } else {
      this.logger.debug(`[${operationId}] Iniciando procesamiento del mensaje: ${pattern}`);
    }

    return next.handle().pipe(
      tap({
        next: (result) => {
          try {
            channel.ack(originalMsg);
            
            // Log de éxito con detalles del resultado
            let resultInfo = '';
            if (result) {
              if (typeof result === 'object') {
                if (result.id) {
                  resultInfo = `, ID generado: ${result.id}`;
                } else if (result.hasQuota !== undefined) {
                  resultInfo = `, cuota ${result.hasQuota ? 'aprobada' : 'rechazada'}`;
                }
              }
            }
            
            this.logger.debug(`[${operationId}] Mensaje procesado correctamente: ${pattern}${resultInfo}`);
            
          } catch (err) {
            if (err.message !== 'Channel closed') {
              this.logger.error(`[${operationId}] Error al confirmar mensaje: ${err.message}`, err.stack);
            }
          }
        },
        error: (error) => {
          try {
            const isBusinessError = ErrorClassifier.isBusinessError(error);

            if (isBusinessError) {
              this.logger.warn(`[${operationId}] Error de negocio en ${pattern}: ${error.message}`);
              
              channel.ack(originalMsg);
            } else {
              const retryCount = this.getRetryCount(originalMsg);
              if (retryCount < 3) {
                this.logger.warn(`[${operationId}] Reintentando mensaje ${pattern}: intento ${retryCount + 1}/3`);
                
                this.incrementRetryCount(originalMsg);
                channel.nack(originalMsg, false, true);
              } else {
                this.logger.error(
                  `[${operationId}] Mensaje fallido después de 3 intentos: ${error.message}`,
                  error.stack
                );
                
                channel.ack(originalMsg);
              }
            }
          } catch (err) {
            if (err.message !== 'Channel closed') {
              this.logger.error(
                `[${operationId}] Error al manejar mensaje erróneo: ${err.message}`, 
                err.stack
              );
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
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}