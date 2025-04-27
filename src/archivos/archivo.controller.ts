// src/archivos/archivo.controller.ts
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { CategoriaArchivo } from '@prisma/client';
import { ArchivoService } from './archivo.service';
import { PaginationDto } from 'src/common';

@Controller()
export class ArchivoController {
  private readonly logger = new Logger(ArchivoController.name);

  constructor(private readonly archivoService: ArchivoService) {}

  @MessagePattern('archivo.create') //OK IMPLEMENTADO - FILESCONTROLLER GATEWAY
  async create(@Payload() createArchivoDto: CreateArchivoDto) {

    return await this.archivoService.create(createArchivoDto);    
  }

  @MessagePattern('archivo.findById') //OK IMPLEMENTADO - FILESCONTROLLER GATEWAY
  async findById(@Payload() id: string) {
    try {
      return await this.archivoService.findById(id);
    } catch (error) {
      this.logger.error(`Error en archivo.findById ${id}:`, error);
      throw new RpcException(error.response || {
        message: error.message,
        status: 500
      });
    }
  }

  @MessagePattern('archivo.findByEntidadFiltrado')//OK IMPLEMENTADO - FILESCONTROLLER GATEWAY
  async findByEntidadFiltrado(@Payload() payload: { 
    tipoEntidad: string; 
    entidadId: string;
    empresaId?: string;
    categoria?: CategoriaArchivo;
    paginationDto: PaginationDto;
  }) {
    try {
      const { tipoEntidad, entidadId, paginationDto, empresaId, categoria } = payload;
      return await this.archivoService.findByEntidadFiltrado(
        tipoEntidad,
        entidadId,
        paginationDto,
        empresaId,
        categoria
      );
    } catch (error) {
      this.logger.error(`Error en archivo.findByEntidadFiltrado:`, error);
      throw new RpcException(error.response || {
        message: error.message,
        status: 500
      });
    }
  }
  
  
  @MessagePattern('archivo.update')
  async update(@Payload() data: { id: string; updateData: Partial<CreateArchivoDto> }) {
    try {
      return await this.archivoService.update(data.id, data.updateData);
    } catch (error) {
      this.logger.error(`Error en archivo.update:`, error);
      throw new RpcException(error.response || {
        message: error.message,
        status: 500
      });
    }
  }

  @MessagePattern('archivo.delete')
  async delete(@Payload() id: string) {
    try {
      return await this.archivoService.delete(id);
    } catch (error) {
      this.logger.error(`Error en archivo.delete:`, error);
      throw new RpcException(error.response || {
        message: error.message,
        status: 500
      });
    }
  }

  @MessagePattern('archivo.deleteByFilename')
  async deleteByFilename(@Payload() filename: string) {
  return this.archivoService.deleteByFilename(filename);
  }
}
