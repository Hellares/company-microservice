// src/storage/storage-quota.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StorageQuotaService {
  private readonly logger = new Logger(StorageQuotaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStorageUsage(empresaId: string) {
    try {
      // Calcular el tamaño total usando Prisma
      const result = await this.prisma.archivo.aggregate({
        where: {
          empresaId: empresaId,
        },
        _sum: {
          tamanho: true,
        },
        _count: true,
      });

      const totalBytes = result._sum.tamanho || 0;
      const usedMB = totalBytes / (1024 * 1024);
      const usedGB = usedMB / 1024;

      return {
        usedBytes: totalBytes,
        usedMB,
        usedGB,
        fileCount: result._count,
      };
    } catch (error) {
      this.logger.error(`Error al calcular uso de almacenamiento: ${error.message}`);
      throw error;
    }
  }
  


  async checkQuota(empresaId: string, fileSize: number) {
    try {
      console.log(empresaId)
      // Obtener el plan activo de la empresa
      const empresaPlan = await this.prisma.empresaPlan.findFirst({
        where: {
          empresaId: empresaId,
          estado: 'ACTIVO',
        },
        include: {
          plan: true,
        },
      });
  
      // Si no hay plan activo, usar valores predeterminados en lugar de lanzar error
      if (!empresaPlan) {
        this.logger.warn(`No se encontró plan activo para empresa ${empresaId}. Usando valores predeterminados.`);
        
        // Usar un valor predeterminado para el límite de almacenamiento
        const defaultStorageGB = 5; // 5 GB por defecto
        const maxStorageBytes = defaultStorageGB * 1024 * 1024 * 1024;
  
        // Obtener uso actual
        const usage = await this.getStorageUsage(empresaId);
        
        // Verificar si hay cuota suficiente
        const hasQuota = (usage.usedBytes + fileSize) <= maxStorageBytes;
        
        return {
          hasQuota,
          isDefaultPlan: true, // Indicar que se está usando un plan predeterminado
          usage,
          limit: {
            maxStorageGB: defaultStorageGB,
            maxStorageBytes,
            percentUsed: (usage.usedBytes / maxStorageBytes) * 100,
          },
          fileSize: {
            bytes: fileSize,
            MB: fileSize / (1024 * 1024),
          },
        };
      }
  
      // Extraer maxStorageGB de los límites del plan (asumiendo que es un campo en el JSON)
      const limites = empresaPlan.plan.limites as any;
      const maxStorageGB = limites.maxStorageGB || 5; // Valor por defecto si no está definido
      const maxStorageBytes = maxStorageGB * 1024 * 1024 * 1024;
  
      // Obtener uso actual
      const usage = await this.getStorageUsage(empresaId);
  
      // Verificar si hay cuota suficiente
      const hasQuota = (usage.usedBytes + fileSize) <= maxStorageBytes;
      
      return {
        hasQuota,
        usage,
        limit: {
          maxStorageGB,
          maxStorageBytes,
          percentUsed: (usage.usedBytes / maxStorageBytes) * 100,
        },
        fileSize: {
          bytes: fileSize,
          MB: fileSize / (1024 * 1024),
        },
      };
    } catch (error) {
      this.logger.error(`Error al verificar cuota: ${error.message}`);
      throw error;
    }
  }
}