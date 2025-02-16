import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import slugify from 'slugify';
import { RpcException } from '@nestjs/microservices';
import { EstadoPlan, Prisma } from '@prisma/client';

@Injectable()
export class EmpresaService {
  private readonly logger = new Logger('EmpresaService');
  constructor(
    private readonly prisma: PrismaService,
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
      const normalizedRuc = dto.ruc.trim();
      const normalizedSlug = dto.slug || this.generateSlug(dto.nombreComercial);

      // Validar formato de RUC
      if (!/^\d{11}$/.test(normalizedRuc)) {
        throw new RpcException({
          message: 'Formato de RUC inválido/RUC debe tener exactamente 11 dígitos numéricos',
          status: 400,
          code: 'INVALID_RUC_FORMAT',
          //detail: 'El RUC debe tener exactamente 11 dígitos numéricos'
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
        throw new RpcException({
          message: `El rubro con ID ${dto.rubroId} no existe en el sistema`,
          status: 404,
          code: 'RUBRO_NOT_FOUND',
        });
      }

      if (!rubro.estado) {
        throw new RpcException({
          message: `El rubro '${rubro.nombre}' no está activo actualmente`,
          status: 400,
          code: 'INACTIVE_RUBRO',
        });
      }

      if (existingSlug) {
        throw new RpcException({
          message: `Ya existe una empresa registrada con el slug '${normalizedSlug}'`,
          status: 409,
          code: 'DUPLICATE_SLUG',
        });
      }

      if (existingRuc) {
        throw new RpcException({
          message: `Ya existe una empresa registrada con el RUC ${normalizedRuc}`,
          status: 409,
          code: 'DUPLICATE_RUC',
        });
      }

      return {
        rubro,
        slug: normalizedSlug,
        normalizedRuc
      };
    } catch (error) {
      this.logger.error('Error en validación de restricciones:', {
        error: error.message,
        dto: { ...dto, rubroId: dto.rubroId },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  private async createEmpresaWithSede(tx: any, dto: CreateEmpresaDto, slug: string, normalizedRuc: string) {
    try {
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

       
      // Crear la sede principal
       await tx.sede.create({
        data: {
          nombre: `Sede Principal - ${dto.nombreComercial}`,
          empresaId: empresa.id,
          esPrincipal: true,
          estado: 'ACTIVA',
        },
      });

      // Buscar y asignar plan básico
    const planBasico = await tx.plan.findFirst({
      where: {
        nivelPlan: 'BASICO',
        estado: true,
      },
    });

    if (!planBasico) {
      throw new RpcException({
        message: 'No se encontró un plan básico activo',
        status: 404,
        code: 'BASIC_PLAN_NOT_FOUND',
      });
    }

    // Crear registro del plan empresarial
    await tx.empresaPlan.create({
      data: {
        empresaId: empresa.id,
        planId: planBasico.id,
        estado: 'ACTIVO',
        montoPagado: new Prisma.Decimal(0),
        fechaInicio: new Date(),
        fechaFin: new Date(Date.now() + planBasico.duracionDias * 24 * 60 * 60 * 1000),
      },
    });

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
      this.logger.error('Error al crear empresa y sede:', {
        error: error.message,
        dto: { ...dto, rubroId: dto.rubroId },
        timestamp: new Date().toISOString()
      });
      
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
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log('Iniciando proceso de creación de empresa...', {
          nombreComercial: createEmpresaDto.nombreComercial,
          ruc: createEmpresaDto.ruc
        });

        // Validar restricciones de negocio
        const { slug, normalizedRuc } = await this.validateBusinessConstraints(tx, createEmpresaDto);

        // Crear empresa y sede
        const empresa = await this.createEmpresaWithSede(tx, createEmpresaDto, slug, normalizedRuc);

        this.logger.log('Empresa y sede principal creadas exitosamente', {
          empresaId: empresa.id,
          nombreComercial: empresa.nombreComercial,
          sedeId: empresa.sedes[0]?.id
        });

        return {
          data: empresa,
          message: 'Empresa creada exitosamente',
          timestamp: new Date().toISOString()
        };
      }, {
        maxWait: 5000,
        timeout: 10000,
      });

      return result;

    } catch (error) {
      this.logger.error('Error en el proceso de creación de empresa:', {
        error: error.message,
        dto: { ...createEmpresaDto, rubroId: createEmpresaDto.rubroId },
        timestamp: new Date().toISOString()
      });

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
}

