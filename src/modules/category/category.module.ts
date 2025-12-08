import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './repository/category.repository';
import { CategoryEntity } from '../../entities/category/category.entity';

@Module({
  imports: [
    // 1. Entity 연결
    TypeOrmModule.forFeature([CategoryEntity]),
  ],
  controllers: [CategoryController],
  providers: [
    CategoryService,
    CategoryRepository, // 2. 커스텀 리포지토리 등록
  ],
  exports: [
    CategoryRepository, // 3. 중요: 다른 모듈(Restaurant)에서 쓰기 위해 내보냄
  ],
})
export class CategoryModule {}
