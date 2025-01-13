import { Controller } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateCompanyDto } from './dto/create.company.dto';
import { PaginationDto } from 'src/common';
import { CreateCustomFieldDto } from './custom-fields/dto/create-custom-field.dto';


@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @MessagePattern('company.create')
  async create(
    @Payload() createCompanyDto: CreateCompanyDto,
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      const result = await this.companiesService.create(createCompanyDto);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      // Confirmamos el mensaje incluso en caso de error para evitar que se quede en la cola
      channel.ack(originalMsg);
      throw error;
    }
  }


  @MessagePattern('company.findAll')
  async findAll(
    @Payload() paginationDto: PaginationDto,
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      const result = await this.companiesService.findAll(paginationDto);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      // Confirmamos el mensaje incluso en caso de error para evitar que se quede en la cola
      channel.ack(originalMsg);
      throw error;
    }
  }


  @MessagePattern('company.findOne')
  async findOne(
    @Payload() identifier: string,
    @Ctx() context: RmqContext
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.companiesService.findOne(identifier);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      channel.ack(originalMsg);
      throw error;
    }
  }

  // Custom Fields
  // @MessagePattern('company.customField.create')
  // async createCustomField(
  //   @Payload() payload: { companyId: string, data: CreateCustomFieldDto },
  //   @Ctx() context: RmqContext
  // ) {
  //   const channel = context.getChannelRef();
  //   const originalMsg = context.getMessage();

  //   try {
  //     const result = await this.companiesService.createCustomField(
  //       payload.companyId, 
  //       payload.data
  //     );
  //     channel.ack(originalMsg);
  //     return result;
  //   } catch (error) {
  //     channel.ack(originalMsg);
  //     throw error;
  //   }
  // }

  // @MessagePattern('company.customField.findByCompany')
  // async getCustomFields(
  //   @Payload() companyId: string,
  //   @Ctx() context: RmqContext
  // ) {
  //   const channel = context.getChannelRef();
  //   const originalMsg = context.getMessage();

  //   try {
  //     const result = await this.companiesService.getCustomFields(companyId);
  //     channel.ack(originalMsg);
  //     return result;
  //   } catch (error) {
  //     channel.ack(originalMsg);
  //     throw error;
  //   }
  // }

}
