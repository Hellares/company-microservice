import { Logger, Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldsService } from './custom-fields.service';

@Module({
  providers: [CustomFieldsService, PrismaService, Logger],
  controllers: [CustomFieldsController],
  exports: [CustomFieldsService]
})
export class CustomFieldsModule {}