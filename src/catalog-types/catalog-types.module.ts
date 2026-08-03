import { Module } from '@nestjs/common';
import { CatalogTypesController } from './catalog-types.controller';
import { CatalogTypesService } from './catalog-types.service';

@Module({
  controllers: [CatalogTypesController],
  providers: [CatalogTypesService],
})
export class CatalogTypesModule {}
