import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessTypeDto } from './dto/create-business-type.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class BusinessTypeService {
  private readonly logger = new Logger('BusinessTypeService');

  constructor(private readonly prisma: PrismaService) {}

  async create(createBusinessTypeDto: CreateBusinessTypeDto) {
    try {
      // Usar transacción para asegurar consistencia
      return await this.prisma.$transaction(async (tx) => {
        // Verificar si ya existe
        const exists = await tx.businessType.findFirst({
          where: { name: createBusinessTypeDto.name }
        });

        if (exists) {
          throw new RpcException(
            {
              message: `El Rubro ${createBusinessTypeDto.name} ya fue registrado`,
              status: HttpStatus.CONFLICT,
              code: 'DUPLICATE_BUSINESS_TYPE'
            }
          );
        }

        // Crear nuevo registro
        const businessType = await tx.businessType.create({
          data: createBusinessTypeDto,
        });

        return businessType;
      });
     
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      
      this.logger.error(`Error creating business type: ${error.message}`);
      throw new RpcException('Error creating business type');
    }
  }


  async findAll() {
    return this.prisma.businessType.findMany({
      where: { active: true },
    });
  }
}