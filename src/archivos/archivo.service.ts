// src/archivos/archivo.service.ts
import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArchivoDto } from './dto/create-archivo.dto';
import { CategoriaArchivo } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { ArchivoCreateData } from './interfaces/archivo-prisma.interface';
import { PaginationDto } from 'src/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ArchivoService {
 

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext('ArchivoService');
  }

  async create(createArchivoDto: CreateArchivoDto) {
    try {
      const prismaData: ArchivoCreateData = {
        nombre: createArchivoDto.nombre,
        filename: createArchivoDto.filename,
        ruta: createArchivoDto.ruta,
        tipo: createArchivoDto.tipo,
        tamanho: createArchivoDto.tamanho,
        categoria: createArchivoDto.categoria,
        empresa: createArchivoDto.empresaId ? {
          connect: { id: createArchivoDto.empresaId }
        } : undefined,
        entidadId: createArchivoDto.entidadId,
        tipoEntidad: createArchivoDto.tipoEntidad,
        descripcion: createArchivoDto.descripcion,
        orden: createArchivoDto.orden,
        esPublico: createArchivoDto.esPublico ?? true,
        provider: createArchivoDto.provider
      };
  
      const archivo = await this.prisma.archivo.create({
        data: prismaData
      });
  
      this.logger.info(`Archivo creado: ${archivo.id}`);
      return archivo;
    } catch (error) {
      // this.logger.error('Error al crear archivo:', error);
      throw new RpcException({
        message: `Error al crear archivo: ${error.message}`,
        status: 500
      });
    }
  }

  async findById(id: string) {
    try {
      const archivo = await this.prisma.archivo.findUnique({
        where: { id },
      });

      if (!archivo) {
        throw new RpcException({
          message: `Archivo con ID ${id} no encontrado`,
          status: 404
        });
      }

      return archivo;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      // this.logger.error(`Error al buscar archivo ${id}:`, error);
      throw new RpcException({
        message: `Error al buscar archivo: ${error.message}`,
        status: 500
      });
    }
  }

  async findByEntidadFiltrado(
    tipoEntidad: string, 
    entidadId: string,
    paginationDto: PaginationDto, 
    empresaId?: string, 
    categoria?: CategoriaArchivo
  ) {
    try {
      const { page, limit } = paginationDto;
      if (page < 1) {
        throw new RpcException({
          message: 'La página debe ser mayor a 0',
          status: HttpStatus.BAD_REQUEST,
        });
      }
      // Construir el objeto where para la consulta
      const where: any = {
        tipoEntidad,
        entidadId
      };
      
      // Añadir filtros opcionales
      if (empresaId) {
        where.empresaId = empresaId;
      }
      
      if (categoria) {
        where.categoria = categoria;
      }
      
      const [total, archivos] = await Promise.all([
        this.prisma.archivo.count({
          where
        }),
        this.prisma.archivo.findMany({
          where,
          orderBy: [
            { orden: 'asc' },
            { createdAt: 'desc' }
          ],
          skip: (page - 1) * limit,
          take: limit
        })
      ]);
      const totalPages = Math.ceil(total / limit);
  
    if (page > totalPages && totalPages > 0) {
      throw new RpcException({
        message: `La página ${page} no existe, la última página es la ${totalPages}`,
        status: HttpStatus.BAD_REQUEST
      });
    }

    return {
      success: true,
      data: archivos,
      metadata: {
        total,
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        tipoEntidad,
        entidadId,
        empresaId,
        categoria
      }
    };
    } catch (error) {
      this.logger.error(`Error al buscar archivos por entidad filtrados:`, error);
      throw new RpcException({
        message: `Error al buscar archivos: ${error.message}`,
        status: 500
      });
    }
  }

  
  async update(id: string, updateData: Partial<CreateArchivoDto>) {
    try {
      const archivo = await this.prisma.archivo.update({
        where: { id },
        data: updateData
      });

      return archivo;
    } catch (error) {
      // this.logger.error(`Error al actualizar archivo ${id}:`, error);
      throw new RpcException({
        message: `Error al actualizar archivo: ${error.message}`,
        status: 500
      });
    }
  }

  async delete(id: string) {
    try {
      await this.prisma.archivo.delete({
        where: { id }
      });

      return {
        success: true,
        message: `Archivo ${id} eliminado correctamente`
      };
    } catch (error) {
      // this.logger.error(`Error al eliminar archivo ${id}:`, error);
      throw new RpcException({
        message: `Error al eliminar archivo: ${error.message}`,
        status: 500
      });
    }
  }

  async deleteByFilename(filename: string) {
    try {
      const archivo = await this.prisma.archivo.findFirst({
        where: { filename }
      });
  
      if (!archivo) {
        throw new RpcException({
          message: `Archivo con filename ${filename} no encontrado`,
          status: 404
        });
      }
  
      await this.prisma.archivo.delete({
        where: { id: archivo.id }
      });
  
      return {
        success: true,
        message: `Archivo ${filename} eliminado correctamente`
      };
    } catch (error) {
      throw new RpcException({
        message: `Error al eliminar archivo: ${error.message}`,
        status: error.status || 500
      });
    }
  }
}
