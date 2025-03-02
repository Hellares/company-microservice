import { Module } from '@nestjs/common';
import { ArchivoService } from './archivo.service';
import { ArchivoController } from './archivo.controller';

@Module({
  controllers: [ArchivoController],
  providers: [ArchivoService],
})
export class ArchivosModule {}
