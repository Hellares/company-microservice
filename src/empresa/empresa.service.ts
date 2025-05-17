import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import slugify from 'slugify';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmpresaService {  
  private readonly logger = new Logger('EmpresaService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy
  ) {}

  private generateSlug(nombreComercial: string): string {
    return slugify(nombreComercial, {
      lower: true,
      strict: true,
      trim: true
    });
  }

  private async validateBusinessConstraints(tx: any, dto: CreateEmpresaDto) {
    try {
      this.logger.debug(`Validando restricciones de negocio para empresa ${dto.nombreComercial} - RUC: ${dto.ruc}`);

      const normalizedRuc = dto.ruc.trim();
      const normalizedSlug = dto.slug || this.generateSlug(dto.nombreComercial);

      // Validar formato de RUC
      if (!/^\d{11}$/.test(normalizedRuc)) {
        this.logger.warn(`Formato de RUC inválido: ${normalizedRuc}`);

        throw new RpcException({
          message: 'Formato de RUC inválido/RUC debe tener exactamente 11 dígitos numéricos',
          status: 400,
          code: 'INVALID_RUC_FORMAT',
        });
      }

      const [existingRuc, rubro, existingSlug] = await Promise.all([
        tx.empresa.findUnique({ 
          where: { ruc: normalizedRuc }, 
          select: { id: true, estado: true } 
        }),
        tx.rubro.findUnique({ 
          where: { id: dto.rubroId }, 
          select: { id: true, estado: true, nombre: true } 
        }),
        tx.empresa.findUnique({ 
          where: { slug: normalizedSlug }, 
          select: { id: true } 
        })
      ]);

      if (!rubro) {
        this.logger.warn(`El rubro con ID ${dto.rubroId} no existe en el sistema`);

        throw new RpcException({
          message: `El rubro con ID ${dto.rubroId} no existe en el sistema`,
          status: 404,
          code: 'RUBRO_NOT_FOUND',
        });
      }

      if (!rubro.estado) {
        this.logger.warn(`El rubro '${rubro.nombre}' no está activo actualmente`);

        throw new RpcException({
          message: `El rubro '${rubro.nombre}' no está activo actualmente`,
          status: 400,
          code: 'INACTIVE_RUBRO',
        });
      }

      if (existingSlug) {
        this.logger.warn(`Ya existe una empresa registrada con el slug '${normalizedSlug}'`);

        throw new RpcException({
          message: `Ya existe una empresa registrada con el slug '${normalizedSlug}'`,
          status: 409,
          code: 'DUPLICATE_SLUG',
        });
      }

      if (existingRuc) {
        this.logger.warn(`Ya existe una empresa registrada con el RUC ${normalizedRuc}`);

        throw new RpcException({
          message: `Ya existe una empresa registrada con el RUC ${normalizedRuc}`,
          status: 409,
          code: 'DUPLICATE_RUC',
        });
      }

      this.logger.debug(`Validación de restricciones exitosa para ${dto.nombreComercial}`);

      return {
        rubro,
        slug: normalizedSlug,
        normalizedRuc
      };
    } catch (error) {
      this.logger.error(`Error en validación de restricciones para ${dto.nombreComercial}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async createEmpresaWithSede(tx: any, dto: CreateEmpresaDto, slug: string, normalizedRuc: string) {
    try {
      this.logger.debug(`Creando empresa y sede principal para ${dto.nombreComercial}`);

      // Crear la empresa
      const empresa = await tx.empresa.create({
        data: {
          nombreComercial: dto.nombreComercial.trim(),
          razonSocial: dto.razonSocial.trim(),
          ruc: normalizedRuc,
          slug,
          rubroId: dto.rubroId,
          logoId: dto.logoId,
          portadaId: dto.portadaId,
          estado: 'EN_REVISION',
          verificada: false,
        },
      });

      this.logger.debug(`Empresa creada correctamente: ${empresa.id} - ${empresa.nombreComercial}`);

       
      // Crear la sede principal
      const sede = await tx.sede.create({
        data: {
          nombre: `Sede Principal - ${dto.nombreComercial}`,
          empresaId: empresa.id,
          esPrincipal: true,
          estado: 'ACTIVA',
        },
      });

      this.logger.debug(`Sede principal creada correctamente: ${sede.id} - ${sede.nombre}`);

      // Buscar y asignar plan básico
      const planBasico = await tx.plan.findFirst({
        where: {
          nivelPlan: 'BASICO',
          estado: true,
        },
      });

      if (!planBasico) {
        this.logger.warn('No se encontró un plan básico activo');

        throw new RpcException({
          message: 'No se encontró un plan básico activo',
          status: 404,
          code: 'BASIC_PLAN_NOT_FOUND',
        });
      }

      // Crear registro del plan empresarial
      const empresaPlan = await tx.empresaPlan.create({
        data: {
          empresaId: empresa.id,
          planId: planBasico.id,
          estado: 'ACTIVO',
          montoPagado: new Prisma.Decimal(0),
          fechaInicio: new Date(),
          fechaFin: new Date(Date.now() + planBasico.duracionDias * 24 * 60 * 60 * 1000),
        },
      });

      this.logger.debug(`Plan básico asignado correctamente: ${empresaPlan.id}`);

      // Retornar empresa con sus relaciones
      return await tx.empresa.findUnique({
        where: { id: empresa.id },
        include: {
          rubro: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            }
          },
          sedes: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              esPrincipal: true,
              createdAt: true
            }
          },
          planesHistorial:{
            select: {
              id: true,
              estado: true,
              montoPagado: true,
              fechaInicio: true,
              fechaFin: true,
              plan: {
                select: {
                  id: true,
                  nombre: true,
                  nivelPlan: true,
                  caracteristicas: true,
                  limites: true,
                }
              }
            },
            where:{
              estado: 'ACTIVO'
            },
            take: 1
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error al crear empresa y sede para ${dto.nombreComercial}: ${error.message}`, error.stack);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new RpcException({
          message: 'Error en la base de datos',
          status: 500,
          code: `DB_ERROR_${error.code}`,
          detail: error.message
        });
      }
      
      throw new RpcException({
        message: 'Error al crear el registro de la empresa',
        status: 500,
        code: 'CREATE_RECORD_ERROR',
        detail: error.message
      });
    }
  }

  async create(createEmpresaDto: CreateEmpresaDto) {
    try {
      this.logger.log(`Iniciando proceso de creación de empresa: ${createEmpresaDto.nombreComercial} - RUC: ${createEmpresaDto.ruc}`);

      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.debug(`Iniciando transacción para empresa ${createEmpresaDto.nombreComercial}`);

        // Validar restricciones de negocio
        const { slug, normalizedRuc } = await this.validateBusinessConstraints(tx, createEmpresaDto);

        // Crear empresa y sede
        const empresa = await this.createEmpresaWithSede(tx, createEmpresaDto, slug, normalizedRuc);

        this.logger.log(`Empresa y sede principal creadas exitosamente: ${empresa.id} - ${empresa.nombreComercial}`);

        // Solo emitir evento si hay datos del creador
        if (createEmpresaDto.creadorId) {
          this.emitEmpresaCreatedEvent(empresa, {
            creadorId: createEmpresaDto.creadorId,
            creadorDni: createEmpresaDto.creadorDni,
            creadorEmail: createEmpresaDto.creadorEmail,
            creadorNombre: createEmpresaDto.creadorNombre,
            creadorApellido: createEmpresaDto.creadorApellido,
            creadorTelefono: createEmpresaDto.creadorTelefono,
          });
        }

        return {
          data: empresa,
          message: 'Empresa creada exitosamente',
          timestamp: new Date().toISOString()
        };
      }, {
        maxWait: 5000,
        timeout: 10000,
      });

      this.logger.log(`Proceso de creación de empresa completado exitosamente: ${result.data.id}`);

      return result;

    } catch (error) {
      this.logger.error(`Error al crear empresa ${createEmpresaDto.nombreComercial}: ${error.message}`, error.stack);
      
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        message: 'Error inesperado al crear la empresa',
        status: 500,
        code: 'UNEXPECTED_ERROR',
        detail: error.message
      });
    }
  }

  private emitEmpresaCreatedEvent(empresa: any, creadorInfo: any) {
    try {
      this.logger.debug(`Emitiendo evento empresa.created para empresa ${empresa.id}`);
      this.logger.debug(`Datos del creador: ${JSON.stringify(creadorInfo)}`);
      
      const eventData = {
        id: empresa.id,
        razonSocial: empresa.razonSocial,
        nombreComercial: empresa.nombreComercial,
        ruc: empresa.ruc,
        creadorId: creadorInfo.creadorId,
        creadorDni: creadorInfo.creadorDni,
        creadorEmail: creadorInfo.creadorEmail,
        creadorNombre: creadorInfo.creadorNombre,
        creadorApellido: creadorInfo.creadorApellido,
        creadorTelefono: creadorInfo.creadorTelefono,
        // Añadir un timestamp y un ID único para evitar procesar duplicados
        timestamp: Date.now(),
      };

      this.logger.debug(`Emitiendo evento con datos: ${JSON.stringify(eventData)}`);
    
     this.authClient.emit('empresa.created', eventData);
      
      this.logger.debug(`Evento empresa.created emitido con éxito`);
    } catch (error) {
      this.logger.error(`Error al emitir evento empresa.created: ${error.message}`, error.stack);
      // No propagamos este error para no afectar la operación principal
    }
  }

  
  async getPlan(empresaId: string) {
    try {
      this.logger.debug(`Obteniendo plan de empresa: ${empresaId}`);

      // Buscar todos los planes de la empresa ordenados por fecha de creación (más reciente primero)
      const empresaPlanes = await this.prisma.empresaPlan.findMany({
        where: {
          empresaId: empresaId,
        },
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5, // Obtener los 5 planes más recientes para análisis
      });

      this.logger.debug(`Se encontraron ${empresaPlanes.length} planes para la empresa ${empresaId}`);
  
      // Si no hay planes, buscar un plan BASICO predeterminado
      if (empresaPlanes.length === 0) {
        this.logger.debug(`No se encontraron planes, buscando plan BASICO predeterminado para empresa ${empresaId}`);

        const planBasico = await this.prisma.plan.findFirst({
          where: {
            nivelPlan: 'BASICO',
            estado: true,
          },
        });
  
        if (planBasico) {
          this.logger.debug(`Se utilizará plan BASICO predeterminado para empresa ${empresaId}`);

          // Retornar información detallada con un plan virtual
          return {
            empresaPlan: {
              empresa: { id: empresaId },
              empresaId: empresaId,
              plan: planBasico,
              planId: planBasico.id,
              estado: 'PENDIENTE', // Usamos PENDIENTE como estado para el plan virtual
              fechaInicio: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            status: 'SIN_PLAN',
            isDefault: true,
            canUploadFiles: false, // No permitir subida de archivos sin un plan real
            limiteAlmacenamiento: planBasico.limites || 1, // Valor predeterminado
            message: 'La empresa no tiene un plan asignado. Se está utilizando un plan básico virtual.'
          };
        }
  
        // Si no hay plan básico predeterminado
        this.logger.warn(`No se encontró ningún plan para la empresa ${empresaId}`);

        throw new RpcException('No se encontró ningún plan para esta empresa');
      }
  
      // El plan más reciente (independientemente de su estado)
      const planReciente = empresaPlanes[0];
      
      // Analizar estado del plan y definir permisos
      let canUploadFiles = false;
      let status = '';
      let message = '';
      
      switch (planReciente.estado) {
        case 'ACTIVO':
          canUploadFiles = true;
          status = 'ACTIVO';
          message = 'Plan activo';
          break;
        case 'PENDIENTE':
          canUploadFiles = false;
          status = 'PENDIENTE';
          message = 'Plan pendiente de activación. No se pueden subir archivos hasta que se active.';
          break;
        case 'VENCIDO':
          canUploadFiles = false;
          status = 'VENCIDO';
          message = 'Plan vencido. Es necesario renovar para poder subir archivos.';
          break;
        case 'CANCELADO':
          canUploadFiles = false;
          status = 'CANCELADO';
          message = 'Plan cancelado. No se pueden subir archivos.';
          break;
        default:
          canUploadFiles = false;
          status = 'DESCONOCIDO';
          message = 'Estado de plan desconocido.';
      }
      
      // Buscar si hay algún plan activo (podría haber varios planes para diferentes servicios)
      const planActivo = empresaPlanes.find(p => p.estado === 'ACTIVO');

      this.logger.debug(`Plan encontrado para empresa ${empresaId}: ${status}`);
      
      return {
        empresaPlan: planActivo || planReciente, // Priorizar plan activo si existe, sino el más reciente
        status,
        isDefault: false,
        canUploadFiles,
        limiteAlmacenamiento: planReciente.plan.limites || 5,
        message,
        historialPlanes: empresaPlanes.map(p => ({
          id: p.id,
          planNombre: p.plan.nombre,
          nivelPlan: p.plan.nivelPlan,
          estado: p.estado,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin
        }))
      };
    } catch (error) {
      this.logger.error(`Error al obtener plan de empresa ${empresaId}: ${error.message}`, error.stack);

      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException(`Error al obtener plan de empresa: ${error.message}`);
    }
  }

  async getEmpresaById(empresaId: string) {
    try {
      this.logger.debug(`Buscando empresa con ID: ${empresaId}`);
      
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
        include: {
          rubro: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            }
          },
          sedes: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              esPrincipal: true,
            },
            where: {
              estado: 'ACTIVA',
            },
            take: 1
          },
          planesHistorial: {
            select: {
              id: true,
              estado: true,
              plan: {
                select: {
                  id: true,
                  nombre: true,
                  nivelPlan: true,
                }
              }
            },
            where: {
              estado: 'ACTIVO',
            },
            take: 1
          }
        }
      });
      
      if (!empresa) {
        throw new RpcException({
          message: `Empresa con ID ${empresaId} no encontrada`,
          status: 404,
          code: 'EMPRESA_NOT_FOUND'
        });
      }
      
      return {
        success: true,
        data: empresa,
      };
    } catch (error) {
      this.logger.error(`Error al buscar empresa ${empresaId}: ${error.message}`, error.stack);
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        message: `Error al buscar empresa: ${error.message}`,
        status: 500,
        code: 'EMPRESA_SEARCH_ERROR'
      });
    }
  }
  
  async getEmpresasByIds(empresasIds: string[]) {
    try {
      this.logger.debug(`Buscando empresas con IDs: ${empresasIds.join(', ')}`);
      
      if (!empresasIds || empresasIds.length === 0) {
        return {
          success: true,
          data: [],
        };
      }
      
      // Buscar las empresas en paralelo
      const empresas = await this.prisma.empresa.findMany({
        where: {
          id: {
            in: empresasIds
          }
        },
        include: {
          rubro: {
            select: {
              id: true,
              nombre: true,
              estado: true,
            }
          },
          sedes: {
            select: {
              id: true,
              nombre: true,
              estado: true,
              esPrincipal: true,
            },
            where: {
              estado: 'ACTIVA',
            },
            take: 1
          },
          planesHistorial: {
            select: {
              id: true,
              estado: true,
              plan: {
                select: {
                  id: true,
                  nombre: true,
                  nivelPlan: true,
                }
              }
            },
            where: {
              estado: 'ACTIVO',
            },
            take: 1
          }
        }
      });
      
      return {
        success: true,
        data: empresas,
      };
    } catch (error) {
      this.logger.error(`Error al buscar empresas: ${error.message}`, error.stack);
      
      throw new RpcException({
        message: `Error al buscar múltiples empresas: ${error.message}`,
        status: 500,
        code: 'EMPRESAS_SEARCH_ERROR'
      });
    }
  }
}