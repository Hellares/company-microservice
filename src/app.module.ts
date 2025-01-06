import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { BusinessTypeModule } from './business-type/business-type.module';

@Module({
  imports: [CompaniesModule, BusinessTypeModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
