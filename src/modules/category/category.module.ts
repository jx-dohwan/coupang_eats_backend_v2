import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './repository/category.repository';
import { CategoryEntity } from '../../entities/category/category.entity';
import { CategoryRepositoryModule } from './repository/category-repository.module';

@Module({
  imports: [CategoryRepositoryModule],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryRepository],
})
export class CategoryModule {}
