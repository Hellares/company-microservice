// src/storage/storage-quota.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { StorageQuotaService } from './storage-quota.service';

@Controller()
export class StorageQuotaController {
  private readonly logger = new Logger('StorageQuotaController');
  constructor(private readonly storageQuotaService: StorageQuotaService) {}

  // @MessagePattern('storage.usage')
  // async getStorageUsage(@Payload() data: { empresaId: string }) {
  //   return this.storageQuotaService.getStorageUsage(data.empresaId);
  // }
  @MessagePattern('storage.usage')
  async getStorageUsage(@Payload() data: { empresaId: string }) {
    try {
      this.logger.debug(`Recibida peticion para obtener uso de almacenamiento: Empresa ${data.empresaId}`);
      
      const resultado = await this.storageQuotaService.getStorageUsage(data.empresaId);
      
      this.logger.debug(`Uso de almacenamiento obtenido para empresa ${data.empresaId}: ${resultado.usedMB.toFixed(2)} MB de ${resultado.fileCount} archivos`);
      
      return resultado;
    } catch (error) {
      this.logger.error(`Error al obtener uso de almacenamiento para empresa ${data.empresaId}: ${error.message}`, error.stack);
      throw new RpcException({
        message: `Error al obtener uso de almacenamiento: ${error.message}`,
        status: 500
      });
    }
  }

  // @MessagePattern('storage.check-quota')
  // async checkQuota(@Payload() data: { empresaId: string; fileSize: number }) {
  //   return this.storageQuotaService.checkQuota(data.empresaId, data.fileSize);
  // }

  @MessagePattern('storage.check-quota')
  async checkQuota(@Payload() data: { empresaId: string; fileSize: number }) {
    try {
      // Log detallado de la petición recibida
      this.logger.log(`Procesando verificacion de cuota para empresa ${data.empresaId}: Tamanio solicitado ${data.fileSize} bytes (${(data.fileSize / (1024 * 1024)).toFixed(2)} MB)`);
      
      // Log antes de verificar plan
      this.logger.debug(`Verificando plan activo para empresa ${data.empresaId}`);
      
      // Llamada al servicio
      const resultado = await this.storageQuotaService.checkQuota(data.empresaId, data.fileSize);
      
      // Log detallado del resultado
      if (resultado.hasQuota) {
        this.logger.log(`Cuota APROBADA para empresa ${data.empresaId}: Espacio disponible suficiente. Usado: ${resultado.usage.usedMB.toFixed(2)}MB/${resultado.limit.maxStorageGB}GB`);
      } else {
        this.logger.warn(`Cuota RECHAZADA para empresa ${data.empresaId}: Espacio insuficiente. Usado: ${resultado.usage.usedMB.toFixed(2)}MB/${resultado.limit.maxStorageGB}GB`);
      }
      
      // Log adicional para verificación de default
      if (resultado.isDefaultPlan) {
        this.logger.warn(`Empresa ${data.empresaId} usando plan predeterminado. Esto podria causar problemas en ciertas operaciones.`);
      }
      
      return resultado;
    } catch (error) {
      // Log detallado del error
      this.logger.error(`Error al verificar cuota para empresa ${data.empresaId} (tamanio: ${data.fileSize} bytes): ${error.message}`, error.stack);
      
      throw new RpcException({
        message: `Error al verificar cuota: ${error.message}`,
        status: 500
      });
    }
  }
  
}