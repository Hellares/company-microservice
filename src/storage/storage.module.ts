// src/storage/storage.module.ts
import { Module } from '@nestjs/common';
import { StorageQuotaService } from './storage-quota.service';
import { StorageQuotaController } from './storage-quota.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StorageQuotaController],
  providers: [StorageQuotaService],
  exports: [StorageQuotaService],
})
export class StorageModule {}