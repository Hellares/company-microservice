import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { extend } from 'joi';
import { CONSOLE_COLORS } from 'src/common/constants/colors.constants';

@Injectable()
export class CompaniesService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(`${CONSOLE_COLORS.TEXT.MAGENTA}Products Service`);

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`${CONSOLE_COLORS.TEXT.CYAN}Connected to database`);
  }
}
