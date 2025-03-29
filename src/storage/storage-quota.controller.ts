// src/storage/storage-quota.controller.ts
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { StorageQuotaService } from './storage-quota.service';

@Controller()
export class StorageQuotaController {
  constructor(private readonly storageQuotaService: StorageQuotaService) {}

  @MessagePattern('storage.usage')
  async getStorageUsage(@Payload() data: { empresaId: string }) {
    return this.storageQuotaService.getStorageUsage(data.empresaId);
  }

  @MessagePattern('storage.check-quota')
  async checkQuota(@Payload() data: { empresaId: string; fileSize: number }) {
    return this.storageQuotaService.checkQuota(data.empresaId, data.fileSize);
  }

  
}