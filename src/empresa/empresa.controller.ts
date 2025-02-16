import { Controller } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { Ctx, Payload, RmqContext, MessagePattern } from '@nestjs/microservices';

@Controller()
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  // @MessagePattern('create.empresa')
  // async create(
  //   @Payload() createEmpresaDto: CreateEmpresaDto,
  //   @Ctx() context: RmqContext
  // ) {
  //   const channel = context.getChannelRef();
  //   const originalMsg = context.getMessage();
  //   try {
  //     const result = await this.empresaService.create(createEmpresaDto);
  //     channel.ack(originalMsg);
  //     return result;
  //   } catch (error) {
  //     // Confirmamos el mensaje incluso en caso de error para evitar que se quede en la cola
  //     channel.ack(originalMsg);
  //     throw error;
  //   }
  // }

  @MessagePattern('create.empresa')
  async create(@Payload() createEmpresaDto: CreateEmpresaDto) {
    return await this.empresaService.create(createEmpresaDto);
  }
}

