import { Controller } from '@nestjs/common';
import { CompaniesService } from './companies.service';


@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}
}
