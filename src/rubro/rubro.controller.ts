import { Controller } from '@nestjs/common';
import { RubroService } from './rubro.service';
import { Ctx, MessagePattern, Payload, RmqContext, RpcException } from '@nestjs/microservices';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { PaginationDto } from 'src/common';

@Controller()
export class RubroController {
  constructor(private readonly rubroService: RubroService) {}

  @MessagePattern('create.Rubro')
  async createRubro(@Payload() createRubroDto: CreateRubroDto) {
    return await this.rubroService.create(createRubroDto);
  }

  @MessagePattern('remove.Rubro')
  async remove(@Payload() id: string) {
    return await this.rubroService.remove(id);
  }

  @MessagePattern('restore.Rubro')
  async restore(@Payload() id: string) {
    return await this.rubroService.restore(id);
  }

  @MessagePattern('findDeleted.Rubro')
  async findDeleted(@Payload() paginationDto: PaginationDto) {
    return await this.rubroService.findDeleted(paginationDto);
  }

  @MessagePattern('findAll.Rubro')
  async findAll(@Payload() paginationDto: PaginationDto) {
    return await this.rubroService.findAll(paginationDto);
  }

  @MessagePattern('reorder.Rubro')
  async reorder(@Payload() data: { rubroId: string; newPosition: number }) {
    return await this.rubroService.reorder(data.rubroId, data.newPosition);
  }
}
