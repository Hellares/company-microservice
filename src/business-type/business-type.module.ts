import { Module } from '@nestjs/common';
import { BusinessTypeService } from './business-type.service';
import { BusinessTypeController } from './business-type.controller';

@Module({
  controllers: [BusinessTypeController],
  providers: [BusinessTypeService],
})
export class BusinessTypeModule {}
