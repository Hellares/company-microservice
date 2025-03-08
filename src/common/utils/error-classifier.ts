import { RpcException } from '@nestjs/microservices';

export class ErrorClassifier {
  static isBusinessError(error: any): boolean {
    return (
      error instanceof RpcException ||
      error?.response?.code ||
      error?.status === 400 ||
      (error?.message && 
        (error.message.includes('Ya existe') || 
         error.message.includes('no encontrado') ||
         error.message.includes('no válido')))
    );
  }
}