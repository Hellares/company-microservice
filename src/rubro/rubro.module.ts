import { Module } from '@nestjs/common';
import { RubroService } from './rubro.service';
import { RubroController } from './rubro.controller';

@Module({
  controllers: [RubroController],
  providers: [RubroService],
})
export class RubroModule {}
