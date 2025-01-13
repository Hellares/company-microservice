import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BusinessTypeService } from './business-type.service';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto';
import { UpdateBusinessTypeDto } from './dto/update-business-type.dto';

@Controller('business-type')
export class BusinessTypeController {
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  @MessagePattern('createBusinessType')
  create(@Payload() createBusinessTypeDto: CreateBusinessTypeDto) {
    return this.businessTypeService.create(createBusinessTypeDto);
  }

  @MessagePattern('findAllBusinessType')
  findAll() {
    return this.businessTypeService.findAll();
  }
}
