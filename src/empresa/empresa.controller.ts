import { Controller } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { Ctx, Payload, RmqContext, MessagePattern } from '@nestjs/microservices';

@Controller()
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}


  @MessagePattern('create.empresa')
  async create(@Payload() createEmpresaDto: CreateEmpresaDto) {
    return await this.empresaService.create(createEmpresaDto);
  }

  @MessagePattern('empresa.get-plan')
async getActivePlan(@Payload() data: { empresaId: string }) {
  return this.empresaService.getPlan(data.empresaId);
}

@MessagePattern('get.empresa.by.id')
async getEmpresaById(@Payload() data: { empresaId: string }) {
  return this.empresaService.getEmpresaById(data.empresaId);
}

@MessagePattern('empresas.by.ids')
async getEmpresasByIds(@Payload() data: { empresasIds: string[] }) {
  return this.empresaService.getEmpresasByIds(data.empresasIds);
}
}

