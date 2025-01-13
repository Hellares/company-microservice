import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { BusinessTypeModule } from './business-type/business-type.module';
import { PrismaModule } from './prisma/prisma.module';
import { CustomFieldsModule } from './companies/custom-fields/custom-fields.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule, 
    BusinessTypeModule,
    CustomFieldsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
