import { HttpStatus, Injectable } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { RpcException } from '@nestjs/microservices';
import { PaginationDto } from 'src/common';

@Injectable()
export class RubroService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private generateSlug(nombre: string): string {
    return slugify(nombre,{
      lower: true,
      strict: true,
      trim: true,
    });
  }

  
  async create (createRubroDto: CreateRubroDto){
    
    try {
      const slug = createRubroDto.slug || this.generateSlug(createRubroDto.nombre);

      //Verificar si existe un rubro con el mismo slug
      const existingRubro = await this.prisma.rubro.findFirst({
        where: {
          OR: [
            { nombre: createRubroDto.nombre },
            { slug },
          ],
        },
      });

      if (existingRubro) {
        throw new RpcException({
          message: 'Ya existe un rubro con ese nombre o slug',
          code: 'DUPLICATE_ENTITY',
          status: HttpStatus.BAD_REQUEST,
          // success: false
        });
      }

      //Obtener el último orden de rubro si no se proporciona
      if(!createRubroDto.orden){
        const lastOrder = await this.prisma.rubro.findFirst({
          where: {
            estado: true,
          },
          orderBy: {
            orden: 'desc',
          }          
        });
        createRubroDto.orden = ( lastOrder?.orden ?? -1 ) + 1;
        
      }
      
      const { tenantId, provider, empresaId, ...data } = createRubroDto; // Desestructurar el dto para omitir las propiedades no necesarias para la creación del rubro
      
      return await this.prisma.rubro.create({
        data: {
          ...data,
          slug,
        },
      });
      
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        message: 'Error interno del servidor',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }


  async findDeleted(paginationDto: PaginationDto) {
    try {

      const { page, limit } = paginationDto;
      
      const [items, rubros] = await Promise.all([
        this.prisma.rubro.count({
          where: { estado: false },
        }),
        this.prisma.rubro.findMany({
          where: { estado: false },
          orderBy: { orden: 'desc' },
          include: {
            empresas: {
              select: {
                razonSocial: true,                
              }
            }
          },
          take: limit,
          skip: limit * (page - 1)
        })
      ]);

      const totalPages = Math.ceil(items / limit);

      if(!rubros.length && page > 1 && items > 0) {
        throw new RpcException({
          message: 'No se encontraron registros',
          status: HttpStatus.NOT_FOUND,
        });
      }

      return {
        data: rubros,
        metadata:{
          total: items,
          page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }
      };
      
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      //this.logger.error(`Error al obtener empresas: ${error.message}`);
      throw new RpcException({
        message: 'Error al obtener el listado de rubros',
        status: 500
      });
    }
    
  }

  
  async findAll(paginationDto: PaginationDto) {
    try {
      const { page, limit } = paginationDto;
      
      // Validación temprana de página
      if (page < 1) {
        throw new RpcException({
          message: 'La página debe ser mayor a 0',
          status: HttpStatus.BAD_REQUEST,
        });
      }
  
      // Optimización: Usar select para traer solo los campos necesarios
      const [total, rubros] = await Promise.all([
        this.prisma.rubro.count({
          where: { estado: true },
        }),
        this.prisma.rubro.findMany({
          where: { estado: true },
          orderBy: { orden: 'desc' },
          select: {
            id: true,  // Especifica solo los campos necesarios del rubro
            nombre: true,
            orden: true,
            icono: true,
            empresas: {
              select: {
                razonSocial: true,
              }
            }
          },
          take: limit,
          skip: limit * (page - 1)
        })
      ]);
  
      const totalPages = Math.ceil(total / limit);
  
      // Validación de página fuera de rango
      if (page > totalPages) {
        throw new RpcException({
          message: 'Página fuera de rango',
          status: HttpStatus.NOT_FOUND,
        });
      }
  
      return {
        data: rubros,
        metadata: {
          total,
          page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }
      };
      
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
        
      throw new RpcException({
        message: 'Error al obtener el listado de rubros',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }


  async remove(id: string) {
    try {
      // 1. Verificar si el rubro existe y obtener su orden actual
      const rubroToDelete = await this.prisma.rubro.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              empresas: true
            }
          }
        }
      });

      if (!rubroToDelete) {
        throw new RpcException({
          message: `Rubro con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
          status: HttpStatus.NOT_FOUND
        });
      }

      // 2. Verificar si tiene empresas activas
      const empresasActivas = await this.prisma.empresa.count({
        where: {
          rubroId: id,
          estado: 'ACTIVA'
        }
      });

      if (empresasActivas > 0) {
        throw new RpcException({
          message: 'No se puede eliminar el rubro porque tiene empresas activas asociadas',
          code: 'CONFLICT',
          status: HttpStatus.CONFLICT
        });
      }

      // 3. Realizar el softDelete y la reorganización en una transacción
      return await this.prisma.$transaction(async (prisma) => {
        // Realizar el softDelete
        await prisma.rubro.update({
          where: { id },
          data: {
            estado: false,
            orden: 9999, // Mover al final temporalmente
            updatedAt: new Date(),
          }
        });

        // Obtener todos los rubros activos para reorganizar
        const rubrosActivos = await prisma.rubro.findMany({
          where: { estado: true },
          orderBy: { orden: 'asc' }
        });

        // Reorganizar los órdenes de los rubros activos
        for (let i = 0; i < rubrosActivos.length; i++) {
          await prisma.rubro.update({
            where: { id: rubrosActivos[i].id },
            data: { orden: i + 1 }
          });
        }

        // Retornar el rubro eliminado (soft delete)
        return prisma.rubro.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                empresas: true
              }
            }
          }
        });
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        message: 'Error al eliminar el rubro',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  // Método para restaurar un rubro eliminado
  async restore(id: string) {
    try {
      const rubroToRestore = await this.prisma.rubro.findUnique({
        where: { id }
      });

      if (!rubroToRestore) {
        throw new RpcException({
          message: `Rubro con ID ${id} no encontrado`,
          code: 'NOT_FOUND',
          status: HttpStatus.NOT_FOUND
        });
      }

      if (rubroToRestore.estado) {
        throw new RpcException({
          message: 'El rubro ya está activo',
          code: 'CONFLICT',
          status: HttpStatus.CONFLICT
        });
      }

      // Obtener el siguiente orden disponible
      const lastRubro = await this.prisma.rubro.findFirst({
        where: { estado: true },
        orderBy: { orden: 'desc' }
      });

      const nextOrder = (lastRubro?.orden ?? 0) + 1;

      // Restaurar el rubro
      return await this.prisma.rubro.update({
        where: { id },
        data: {
          estado: true,
          orden: nextOrder,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        message: 'Error al restaurar el rubro',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

  // Método para reordenar rubros
  async reorder(rubroId: string, newPosition: number) {
    try {
    const rubros = await this.prisma.rubro.findMany({
      where: { estado: true },
      orderBy: {
        orden: 'asc',
      },
    });

    const currentRubro = rubros.find(r => r.id === rubroId);
    if (!currentRubro) {
      throw new RpcException({
        message: `Rubro con ID ${rubroId} no encontrado`,
        code: 'NOT_FOUND',
        status: HttpStatus.NOT_FOUND
      });
    }

    // Validar que la nueva posición sea válida
    if (newPosition < 1 || newPosition > rubros.length) {
      throw new RpcException({
        message: `Posición ${newPosition} no válida`,
        code: 'INVALID_POSITION',
        status: HttpStatus.BAD_REQUEST
      });
    }

    const currentPosition = currentRubro.orden;

    // Usar una transacción para actualizar todos los órdenes de manera atómica
    return await this.prisma.$transaction(async (prisma) => {
      if (newPosition < currentPosition) {
        // Mover hacia arriba: incrementar orden de los rubros en medio
        await prisma.rubro.updateMany({
          where: {
            AND: [
              { orden: { gte: newPosition } },
              { orden: { lt: currentPosition } },
            ],
          },
          data: {
            orden: {
              increment: 1,
            },
          },
        });
      } else if (newPosition > currentPosition) {
        // Mover hacia abajo: decrementar orden de los rubros en medio
        await prisma.rubro.updateMany({
          where: {
            AND: [
              { orden: { gt: currentPosition } },
              { orden: { lte: newPosition } },
            ],
          },
          data: {
            orden: {
              decrement: 1,
            },
          },
        });
      }

      // Actualizar el orden del rubro objetivo
      return await prisma.rubro.update({
        where: { id: rubroId },
        data: { orden: newPosition },
      });
    });
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        message: 'Error al reordenar rubros',
        status: HttpStatus.INTERNAL_SERVER_ERROR
      });
    }
  }

}
