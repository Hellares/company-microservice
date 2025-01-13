import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CONSOLE_COLORS } from 'src/common/constants/colors.constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create.company.dto';
import { RpcException } from '@nestjs/microservices';
import { generateShortTenantId, generateTenantId, generateTenantIdWithTimestamp } from 'src/common/helpers/generate-tenant.helper';
import { Prisma } from '@prisma/client';
import { PaginationDto } from 'src/common';
import { CreateCustomFieldDto } from './custom-fields/dto/create-custom-field.dto';
import { CustomFieldType } from './custom-fields/enums/custom-field-type.enum';

@Injectable()
export class CompaniesService  {

  private readonly logger = new Logger(`${CONSOLE_COLORS.TEXT.MAGENTA}Company Service`);

  constructor(private readonly prisma: PrismaService) {}

  private async validateBusinessConstraints(tx: any, dto: CreateCompanyDto, tenantId: string) {
    // Agregar validación de datos de entrada
    if (!dto || !tenantId) {
      throw new RpcException({
        message: 'Datos de entrada inválidos',
        status: 400
      });
    }

    // Normalizar datos antes de la validación
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedRuc = dto.ruc.trim();

    const [existingTenant, existingRuc, existingEmail, businessType] = await Promise.all([
      tx.company.findUnique({
        where: { tenantId },
        select: { id: true }
      }),
      tx.company.findUnique({
        where: { ruc: normalizedRuc },
        select: { id: true }
      }),
      tx.company.findUnique({
        where: { email: normalizedEmail },
        select: { id: true }
      }),
      tx.businessType.findUnique({
        where: { id: dto.businessTypeId },
        select: { id: true, name: true, active: true }  // Agregar validación de estado activo
      })
    ]).catch(error => {
      this.logger.error('Error en validación de restricciones:', error);
      throw new RpcException({
        message: 'Error en la validación de datos',
        status: 500
      });
    });

    // Validaciones mejoradas con mensajes más específicos
    if (existingTenant) {
      throw new RpcException({
        message: 'Error al generar identificador único de empresa',
        status: 409,
        code: 'DUPLICATE_TENANT'
      });
    }

    if (!businessType) {
      throw new RpcException({
        message: `El rubro con ID ${dto.businessTypeId} no existe`,
        status: 404,
        code: 'BUSINESS_TYPE_NOT_FOUND'
      });
    }

    // Agregar validación de estado activo
    if (businessType && !businessType.active) {
      throw new RpcException({
        message: `El rubro seleccionado no está activo`,
        status: 400,
        code: 'INACTIVE_BUSINESS_TYPE'
      });
    }

    if (existingRuc) {
      throw new RpcException({
        message: `Ya existe una empresa registrada con el RUC ${normalizedRuc}`,
        status: 409,
        code: 'DUPLICATE_RUC'
      });
    }

    if (existingEmail) {
      throw new RpcException({
        message: `Ya existe una empresa registrada con el Email ${normalizedEmail}`,
        status: 409,
        code: 'DUPLICATE_EMAIL'
      });
    }

    return businessType;  // Importante retornar el businessType para su uso posterior
  }

  private async createCompanyRecord(tx: any, dto: CreateCompanyDto, tenantId: string) {
    try {
      return await tx.company.create({
        data: {
          ...dto,
          email: dto.email.toLowerCase().trim(),
          ruc: dto.ruc.trim(),
          tenantId,
        },
        include: {
          businessType: {
            select: {
              id: true,
              name: true,
              active: true
            }
          }
        }
      });
    } catch (error) {
      this.logger.error('Error al crear registro de empresa:', error);
      throw new RpcException({
        message: 'Error al crear el registro de la empresa',
        status: 500,
        code: 'CREATE_RECORD_ERROR'
      });
    }
  }

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        this.logger.log('Iniciando creación de empresa...');
        
        const tenantId = generateTenantId(createCompanyDto.name);
        this.logger.debug(`TenantId generado: ${tenantId}`);
        
        await this.validateBusinessConstraints(tx, createCompanyDto, tenantId);
        
        const company = await this.createCompanyRecord(tx, createCompanyDto, tenantId);
        
        this.logger.log(`Empresa creada exitosamente: ${company.name} (${company.ruc})`);
        
        return {
          ...company,
          message: 'Empresa creada exitosamente'
        };
      }, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        // retryNumber: 3  // Agregar reintentos para manejar errores transitorios
      });
      
    } catch (error) {
      this.logger.error(`Error en la creación de empresa: ${error.message}`, {
        dto: createCompanyDto,
        errorType: error instanceof RpcException ? 'RpcException' : 'UnknownError',
        timestamp: new Date().toISOString()
      });
      
      if (error instanceof RpcException) {
        throw error;
      }
      
      throw new RpcException({
        message: 'Error al crear la empresa',
        status: 500,
        error: error.message,
        code: 'UNKNOWN_ERROR'
      });
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { page, limit } = paginationDto;
  
      // Ejecutar ambas consultas en paralelo para optimizar
      const [items, companies] = await Promise.all([
        this.prisma.company.count({ 
          where: { active: true } 
        }),
        this.prisma.company.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where: { active: true },
          orderBy: {
            createdAt: 'desc'
          }
        })
      ]);
  
      const totalPages = Math.ceil(items / limit);
  
      if (!companies.length && page > 1 && items > 0) {
        throw new RpcException({
          message: 'No hay resultados para esta página',
          status: 404
        });
      }
  
      return {
        data: companies,
        metadata: {
          total: items,
          page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
  
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
  
      this.logger.error(`Error al obtener empresas: ${error.message}`);
      throw new RpcException({
        message: 'Error al obtener el listado de empresas',
        status: 500
      });
    }
  }

  async findOne(identifier: string) {
    try {
      if (!identifier || identifier.trim() === '') {
        throw new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: 'El identificador no puede estar vacío'
        });
      }
  
      const company = await this.prisma.company.findFirst({
        where: {
          OR: [
            { ruc: identifier },
            { tenantId: identifier },
            { id: identifier }
          ],
          active: true
        },
        include: {
          businessType: {
            select: {
              // id: true,
              name: true
            }
          }
        }
      });
  
      if (!company) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `No se encontró la empresa con identificador ${identifier}`
        });
      }
  
      return {
        data: company,
        message: 'Empresa encontrada exitosamente'
      };
  
    } catch (error) {  
      if (error instanceof RpcException) {
        throw error;
      }
  
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error al buscar la empresa',
        // error: error.message
      });
    }
  }

  // Custom Fields
  private validateFieldValue(type: CustomFieldType, value: any): boolean {
    switch (type) {
      case CustomFieldType.TEXT:
        return typeof value === 'string';
      
      case CustomFieldType.NUMBER:
        return !isNaN(Number(value));
      
      case CustomFieldType.DATE:
        return !isNaN(Date.parse(value));
      
      case CustomFieldType.EMAIL:
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      
      case CustomFieldType.PHONE:
        // Ajusta la regex según tus necesidades
        return /^\+?[\d\s-]{8,}$/.test(value);
      
      case CustomFieldType.SCHEDULE:
        return this.validateSchedule(value);
      
      case CustomFieldType.SELECT:
        try {
          const select = typeof value === 'string' ? JSON.parse(value) : value;
          return (
            Array.isArray(select.options) &&
            select.options.length > 0 &&
            select.options.includes(select.selected)
          );
        } catch {
          return false;
        }

      default:
        return true;
    }
  }

  private validateSchedule(value: any): boolean {
    try {
      const schedule = typeof value === 'string' ? JSON.parse(value) : value;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      // Verificar que existan todos los días
      const hasAllDays = days.every(day => schedule.hasOwnProperty(day));
      if (!hasAllDays) return false;

      // Verificar el formato de cada día
      const isDayValid = (day: any) => {
        if (!day.hasOwnProperty('active')) return false;
        if (day.active) {
          // Si el día está activo, debe tener horarios válidos
          const isTimeFormat = (time: string) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
          return isTimeFormat(day.open) && isTimeFormat(day.close);
        }
        return true; // Si el día no está activo, no necesita horarios
      };

      return Object.values(schedule).every(day => isDayValid(day));
    } catch {
      return false;
    }
  }
  

  // async createCustomField(companyId: string, dto: CreateCustomFieldDto) {
  //   try {
  //     // Validaciones de empresa y campo existente
  //     const [company, existingField] = await Promise.all([
  //       this.prisma.company.findUnique({
  //         where: { id: companyId }
  //       }),
  //       this.prisma.customField.findUnique({
  //         where: {
  //           companyId_fieldName: {
  //             companyId,
  //             fieldName: dto.fieldName
  //           }
  //         }
  //       })
  //     ]);
   
  //     if (!company) {
  //       throw new RpcException({
  //         message: 'Empresa no encontrada',
  //         status: 404
  //       });
  //     }
   
  //     if (existingField) {
  //       throw new RpcException({
  //         message: `Ya existe un campo con el nombre ${dto.fieldName}`,
  //         status: 409
  //       });
  //     }
   
  //     // Procesar el fieldValue según el tipo
  //     let processedValue: any = dto.fieldValue;
   
  //     if (dto.fieldType === CustomFieldType.SELECT || 
  //         dto.fieldType === CustomFieldType.SCHEDULE) {
  //       // Para tipos complejos, aseguramos que sea un objeto
  //       processedValue = typeof dto.fieldValue === 'string' 
  //         ? JSON.parse(dto.fieldValue) 
  //         : dto.fieldValue;
  //     } else {
  //       // Para tipos simples, convertimos a string
  //       processedValue = String(dto.fieldValue);
  //     }
   
  //     const customField = await this.prisma.customField.create({
  //       data: {
  //         fieldName: dto.fieldName,
  //         fieldType: dto.fieldType,
  //         fieldValue: processedValue,
  //         isRequired: dto.isRequired ?? false,
  //         companyId
  //       }
  //     });
   
  //     this.logger.log(`Campo personalizado creado: ${dto.fieldName} para empresa ${companyId}`);
   
  //     return {
  //       data: customField,
  //       message: 'Campo personalizado creado exitosamente'
  //     };
   
  //   } catch (error) {
  //     this.logger.error('Error al crear campo personalizado:', {
  //       error: error.message,
  //       companyId,
  //       fieldName: dto.fieldName,
  //       fieldType: dto.fieldType
  //     });
   
  //     if (error instanceof RpcException) {
  //       throw error;
  //     }
   
  //     if (error instanceof Prisma.PrismaClientKnownRequestError) {
  //       throw new RpcException({
  //         message: 'Error de validación en la base de datos',
  //         status: 400
  //       });
  //     }
   
  //     throw new RpcException({
  //       message: 'Error al crear el campo personalizado',
  //       status: 500
  //     });
  //   }
  //  }


  // async getCustomFields(companyId: string) {
  //   try {
  //     const fields = await this.prisma.customField.findMany({
  //       where: {
  //         companyId,
  //         active: true
  //       },
  //       orderBy: {
  //         createdAt: 'desc'
  //       }
  //     });

  //     return {
  //       data: fields,
  //       message: 'Campos personalizados recuperados exitosamente'
  //     };

  //   } catch (error) {
  //     this.logger.error(`Error al recuperar campos personalizados: ${error.message}`);
  //     throw new RpcException({
  //       message: 'Error al recuperar los campos personalizados',
  //       status: 500
  //     });
  //   }
  // }

}
