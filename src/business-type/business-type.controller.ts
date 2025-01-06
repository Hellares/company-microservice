import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BusinessTypeService } from './business-type.service';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto';
import { UpdateBusinessTypeDto } from './dto/update-business-type.dto';

@Controller()
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

  @MessagePattern('findOneBusinessType')
  findOne(@Payload() id: number) {
    return this.businessTypeService.findOne(id);
  }

  @MessagePattern('updateBusinessType')
  update(@Payload() updateBusinessTypeDto: UpdateBusinessTypeDto) {
    return this.businessTypeService.update(updateBusinessTypeDto.id, updateBusinessTypeDto);
  }

  @MessagePattern('removeBusinessType')
  remove(@Payload() id: number) {
    return this.businessTypeService.remove(id);
  }
}
