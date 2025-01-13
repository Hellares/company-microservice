// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CONSOLE_COLORS } from '../common/constants/colors.constants';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });

    //Extensiones avanzadas
    this.$extends({
      name: 'customLogger',
      query: {
        async $allOperations({ operation, model, args, query }) {
          const start = Date.now();
          
          try {
            const result = await query(args);
            const duration = Date.now() - start;
            
            this.logger.log(
              `${CONSOLE_COLORS.TEXT.MAGENTA}Query ${model}.${operation} took ${duration}ms`
            );
            
            return result;
          } catch (error) {
            this.logger.error(
              `${CONSOLE_COLORS.TEXT.RED}Error in ${model}.${operation}: ${error.message}`
            );
            throw error;
          }
        },
      },
      
      // model: {
      //   // Extensiones específicas para modelos
      //   company: {
      //     async softDelete(id: string) {
      //       return this.company.update({
      //         where: { id },
      //         data: { active: false }
      //       });
      //     },
      //   },
      // },
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`${CONSOLE_COLORS.TEXT.CYAN}Database connection established`);
  }

  async onModuleDestroy() {
    this.logger.log(`${CONSOLE_COLORS.TEXT.YELLOW}Closing database connection`);
    await this.$disconnect();
  }
}