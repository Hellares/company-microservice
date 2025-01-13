import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateCustomFieldDto } from "./dto/create-custom-field.dto";
import { RpcException } from "@nestjs/microservices";
import { CompanyPlan, PLAN_FIELD_LIMITS } from "../constants/plan-limits.contant";
import { CustomFieldType } from "./enums/custom-field-type.enum";
import { Prisma } from "@prisma/client";
import { CustomFieldQueryDto } from "./dto/custom-field-query.dto";

// src/companies/custom-fields/custom-fields.service.ts
@Injectable()
export class CustomFieldsService {
  private readonly logger = new Logger
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(companyId: string, dto: CreateCustomFieldDto) {
    try {
      // Validar límites del plan
      await this.validateFieldLimits(companyId, dto.fieldType);
      
      // Validar empresa y nombre único
      const [company, existingField] = await Promise.all([
        this.validateCompanyExists(companyId),
        this.validateFieldNameUnique(companyId, dto.fieldName)
      ]);

      // Validar el formato del valor según el tipo
      if (!this.validateFieldValue(dto.fieldType, dto.fieldValue)) {
        throw new RpcException({
          message: `Valor inválido para el tipo de campo ${dto.fieldType}`,
          status: 400
        });
      }

      // Procesar el valor según el tipo
      const processedValue = this.processFieldValue(dto.fieldType, dto.fieldValue);

      const customField = await this.prisma.customField.create({
        data: {
          fieldName: dto.fieldName,
          fieldType: dto.fieldType,
          fieldValue: processedValue,
          isRequired: dto.isRequired ?? false,
          companyId
        }
      });

      this.logger.log(`Campo personalizado creado: ${dto.fieldName} para empresa ${companyId}`);

      return {
        data: customField,
        message: 'Campo personalizado creado exitosamente'
      };
    } catch (error) {
      this.handleError(error, 'Error al crear campo personalizado', { companyId, dto });
    }
  }

  // Métodos privados de validación
  private async validateCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new RpcException({
        message: 'Empresa no encontrada',
        status: 404
      });
    }

    return company;
  }

  private async validateFieldNameUnique(companyId: string, fieldName: string) {
    const existingField = await this.prisma.customField.findUnique({
      where: {
        companyId_fieldName: {
          companyId,
          fieldName
        }
      }
    });

    if (existingField) {
      throw new RpcException({
        message: `Ya existe un campo con el nombre ${fieldName}`,
        status: 409
      });
    }
  }

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
        case CustomFieldType.MULTISELECT:
          try {
            const multiselect = typeof value === 'string' ? JSON.parse(value) : value;
            return (
              multiselect && 
              typeof multiselect === 'object' &&
              Array.isArray(multiselect.options) &&
              multiselect.options.length > 0 &&
              Array.isArray(multiselect.selected) &&
              multiselect.selected.every(item => multiselect.options.includes(item))
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
      
      const hasAllDays = days.every(day => schedule.hasOwnProperty(day));
      if (!hasAllDays) return false;

      const isDayValid = (day: any) => {
        if (!day.hasOwnProperty('active')) return false;
        if (day.active) {
          const isTimeFormat = (time: string) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
          return isTimeFormat(day.open) && isTimeFormat(day.close);
        }
        return true;
      };

      return Object.values(schedule).every(day => isDayValid(day));
    } catch {
      return false;
    }
  }

  
  private handleError(error: any, message: string, context: any = {}) {
    this.logger.error(message, {
      error: error.message,
      ...context
    });

    if (error instanceof RpcException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new RpcException({
        message: 'Error de validación en la base de datos',
        status: 400
      });
    }

    throw new RpcException({
      message: message,
      status: 500
    });
  }

  // async update(companyId: string, fieldId: string, dto: UpdateCustomFieldDto) {
  //   try {
  //     const existingField = await this.validateFieldExists(companyId, fieldId);
      
  //     let processedValue = this.processFieldValue(dto.fieldType || existingField.fieldType, dto.fieldValue);

  //     const updatedField = await this.prisma.customField.update({
  //       where: { id: fieldId },
  //       data: {
  //         ...dto,
  //         fieldValue: processedValue
  //       }
  //     });

  //     return {
  //       data: updatedField,
  //       message: 'Campo personalizado actualizado exitosamente'
  //     };
  //   } catch (error) {
  //     this.handleError(error, 'Error al actualizar campo personalizado', { companyId, fieldId, dto });
  //   }
  // }

  async findAll(companyId: string, query?: CustomFieldQueryDto) {
    try {
      const { 
        fieldType, 
        search, 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = query || {};
  
      const where: Prisma.CustomFieldWhereInput = {
        companyId,
        active: true,
        ...(fieldType && { fieldType }),
        ...(search && {
          OR: [
            { fieldName: { contains: search, mode: 'insensitive' } },
            // Para campos JSON, use string() para forzar la conversión a cadena
            // { fieldValue: { string: { contains: search } } }
          ]
        })
      };
  
      const [total, fields] = await Promise.all([
        this.prisma.customField.count({ where }),
        this.prisma.customField.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit
        })
      ]);
  
      // Opcional: procesar fieldValue para parsearlo si es un JSON string
      const processedFields = fields.map(field => ({
        ...field,
        fieldValue: typeof field.fieldValue === 'string' 
          ? this.tryParseJson(field.fieldValue) 
          : field.fieldValue
      }));
  
      return {
        data: processedFields,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        },
        message: 'Campos personalizados recuperados exitosamente'
      };
    } catch (error) {
      this.handleError(error, 'Error al recuperar campos personalizados', { companyId, query });
    }
  }
    // Método de utilidad para parsear JSON de forma segura
    private tryParseJson(value: string) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
  

  // async delete(companyId: string, fieldId: string) {
  //   try {
  //     await this.validateFieldExists(companyId, fieldId);

  //     await this.prisma.customField.update({
  //       where: { id: fieldId },
  //       data: { active: false }
  //     });

  //     return {
  //       message: 'Campo personalizado eliminado exitosamente'
  //     };
  //   } catch (error) {
  //     this.handleError(error, 'Error al eliminar campo personalizado', { companyId, fieldId });
  //   }
  // }

  // async getFieldsUsage(companyId: string) {
  //   try {
  //     const company = await this.prisma.company.findUnique({
  //       where: { id: companyId },
  //       select: { plan: true }
  //     });

  //     const planLimits = PLAN_FIELD_LIMITS[company.plan];
  //     const usage = await this.prisma.customField.groupBy({
  //       by: ['fieldType'],
  //       where: { companyId, active: true },
  //       _count: true
  //     });

  //     return {
  //       data: {
  //         plan: company.plan,
  //         limits: planLimits,
  //         usage: this.formatUsage(usage),
  //         totalUsed: usage.reduce((sum, curr) => sum + curr._count, 0),
  //         totalAvailable: planLimits.total
  //       },
  //       message: 'Uso de campos personalizados recuperado exitosamente'
  //     };
  //   } catch (error) {
  //     this.handleError(error, 'Error al obtener uso de campos', { companyId });
  //   }
  // }

  // Métodos privados de utilidad
  private async validateFieldLimits(companyId: string, fieldType: CustomFieldType) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { 
        plan: true,
        id: true  // siempre es bueno incluir el id
      }
    });
  
    if (!company) {
      throw new RpcException({
        message: 'Empresa no encontrada',
        status: 404
      });
    }
  
    const planLimits = PLAN_FIELD_LIMITS[company.plan as CompanyPlan];
  
    // Validar límite total de campos
    if (planLimits.total !== -1) {
      const totalFields = await this.prisma.customField.count({
        where: { 
          companyId, 
          active: true 
        }
      });
  
      if (totalFields >= planLimits.total) {
        throw new RpcException({
          message: `Has alcanzado el límite de campos personalizados para tu plan ${company.plan}`,
          status: 400,
          code: 'FIELD_LIMIT_EXCEEDED'
        });
      }
    }
  
    // Validar límite por tipo de campo
    if (planLimits.perType[fieldType] !== -1) {
      const typeFields = await this.prisma.customField.count({
        where: { 
          companyId, 
          fieldType,
          active: true 
        }
      });
  
      if (typeFields >= planLimits.perType[fieldType]) {
        throw new RpcException({
          message: `Has alcanzado el límite de campos tipo ${fieldType} para tu plan ${company.plan}`,
          status: 400,
          code: 'TYPE_LIMIT_EXCEEDED'
        });
      }
    }
  }

  private processFieldValue(type: CustomFieldType, value: any) {
    switch (type) {
      case CustomFieldType.SELECT:
      case CustomFieldType.SCHEDULE:
      case CustomFieldType.MULTISELECT:
        return typeof value === 'string' ? JSON.parse(value) : value;
      default:
        return String(value);
    }
  }

  // ... resto de métodos privados de validación y utilidad
}